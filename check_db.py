import sqlite3

conn = sqlite3.connect('users.db')
cursor = conn.cursor()

# Check if table exists
cursor.execute("SELECT name FROM sqlite_master WHERE type='table' AND name='birth_data'")
result = cursor.fetchone()

if result:
    print("Table 'birth_data' exists")
    cursor.execute("PRAGMA table_info(birth_data)")
    columns = cursor.fetchall()
    print("\nColumns in birth_data:")
    for col in columns:
        print(f"  {col}")
else:
    print("Table 'birth_data' does not exist")

conn.close()
