from io import BytesIO


def signup_user(client, email="user@example.com", password="Password123", name="Test User", nationality="india"):
    response = client.post(
        "/signup",
        json={"email": email, "password": password, "name": name, "nationality": nationality},
    )
    assert response.status_code == 200, response.text
    return response.json()


def login_user(client, email="user@example.com", password="Password123"):
    response = client.post("/login", json={"email": email, "password": password})
    assert response.status_code == 200, response.text
    return response.json()


def test_auth_profile_dashboard_flow(client):
    signup_payload = signup_user(client)
    token = signup_payload["access_token"]
    headers = {"Authorization": f"Bearer {token}"}

    profile_response = client.put(
        "/profile",
        headers=headers,
        json={
          "name": "Test User",
          "phone": "9999999999",
          "dob": "1998-04-14",
          "birth_time": "09:15",
          "birth_place": "Delhi",
          "education": "B.Tech",
          "interests": "AI, Product",
          "goals": "Senior Product Role",
          "current_role": "Analyst",
          "years_experience": 3,
          "goal_clarity": "high",
          "role_match": "medium",
        },
    )
    assert profile_response.status_code == 200, profile_response.text
    assert profile_response.json()["profile_completed"] is True

    me_response = client.get("/auth/me", headers=headers)
    assert me_response.status_code == 200
    assert me_response.json()["email"] == "user@example.com"

    dashboard_response = client.get("/career/dashboard", headers=headers)
    assert dashboard_response.status_code == 200
    assert "career_alignment_score" in dashboard_response.json()


def test_refresh_email_verification_and_password_reset_flow(client):
    signup_payload = signup_user(client, email="secure@example.com")
    refresh_response = client.post("/auth/refresh", json={"refresh_token": signup_payload["refresh_token"]})
    assert refresh_response.status_code == 200, refresh_response.text
    assert refresh_response.json()["user"]["email"] == "secure@example.com"

    verify_response = client.post("/auth/verify-email", json={"token": signup_payload["verification_token"]})
    assert verify_response.status_code == 200, verify_response.text

    reset_request = client.post("/auth/request-password-reset", json={"email": "secure@example.com"})
    assert reset_request.status_code == 200, reset_request.text
    reset_token = reset_request.json()["reset_token"]

    reset_confirm = client.post(
        "/auth/reset-password",
        json={"token": reset_token, "new_password": "NewPassword123"},
    )
    assert reset_confirm.status_code == 200, reset_confirm.text

    login_after_reset = client.post("/login", json={"email": "secure@example.com", "password": "NewPassword123"})
    assert login_after_reset.status_code == 200, login_after_reset.text


def test_login_lockout_and_multilingual_defaults(client):
    signup_payload = signup_user(client, email="locked@example.com", nationality="germany")
    me_response = client.get("/auth/me", headers={"Authorization": f"Bearer {signup_payload['access_token']}"})
    assert me_response.status_code == 200
    assert me_response.json()["language"] == "german"

    for _ in range(5):
        invalid_login = client.post("/login", json={"email": "locked@example.com", "password": "WrongPassword123"})
        assert invalid_login.status_code == 400

    locked_login = client.post("/login", json={"email": "locked@example.com", "password": "Password123"})
    assert locked_login.status_code == 423


def test_upload_flow_and_admin_route_edge_cases(client):
    signup_payload = signup_user(client, email="upload@example.com")
    user_headers = {"Authorization": f"Bearer {signup_payload['access_token']}"}

    upload_response = client.post(
        "/upload-profile-pic",
        headers=user_headers,
        files={"file": ("avatar.png", BytesIO(b"fake-image-bytes"), "image/png")},
    )
    assert upload_response.status_code == 200, upload_response.text
    assert "/uploads/" in upload_response.json()["image_url"]

    forbidden_admin = client.get("/admin/dashboard", headers=user_headers)
    assert forbidden_admin.status_code == 403


def test_admin_login_dashboard_and_role_update_flow(client):
    token = signup_user(client, email="member@example.com")["access_token"]
    user_headers = {"Authorization": f"Bearer {token}"}
    me_response = client.get("/auth/me", headers=user_headers)
    user_id = me_response.json()["user_id"]

    admin_login = client.post("/admin-login", json={"email": "admin@gmail.com", "password": "admin123"})
    assert admin_login.status_code == 200, admin_login.text
    admin_token = admin_login.json()["access_token"]
    admin_headers = {"Authorization": f"Bearer {admin_token}"}

    admin_dashboard = client.get("/admin/dashboard", headers=admin_headers)
    assert admin_dashboard.status_code == 200
    assert admin_dashboard.json()["stats"]["total_users"] >= 2

    role_update = client.patch(f"/admin/users/{user_id}/role", headers=admin_headers, json={"role": "support"})
    assert role_update.status_code == 200
    assert role_update.json()["role"] == "support"

    detail_response = client.get(f"/admin/users/{user_id}", headers=admin_headers)
    assert detail_response.status_code == 200
    assert detail_response.json()["user"]["role"] == "support"

    suspend_response = client.patch(f"/admin/users/{user_id}/suspend", headers=admin_headers, json={"suspended": True})
    assert suspend_response.status_code == 200
    assert suspend_response.json()["suspended"] is True


def test_admin_activity_log_management(client):
    signup_user(client, email="activity@example.com")

    admin_login = client.post("/admin-login", json={"email": "admin@gmail.com", "password": "admin123"})
    admin_headers = {"Authorization": f"Bearer {admin_login.json()['access_token']}"}

    logs_response = client.get("/admin/activity-logs", headers=admin_headers)
    assert logs_response.status_code == 200
    logs = logs_response.json()["activity_logs"]
    assert len(logs) >= 1

    first_log_id = logs[0]["id"]
    delete_one = client.delete(f"/admin/activity-logs/{first_log_id}", headers=admin_headers)
    assert delete_one.status_code == 200

    delete_all = client.delete("/admin/activity-logs", headers=admin_headers)
    assert delete_all.status_code == 200

    logs_after = client.get("/admin/activity-logs", headers=admin_headers)
    assert logs_after.status_code == 200
    assert logs_after.json()["activity_logs"] == []
