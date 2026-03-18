import os
from database import engine, Base
import models

# Remove old database
if os.path.exists('users.db'):
    try:
        os.remove('users.db')
        print("Old database removed")
    except Exception as e:
        print(f"Could not remove old database: {e}")

# Create all tables
Base.metadata.create_all(bind=engine)

# Verify the schema
import sqlite3
conn = sqlite3.connect('users.db')
cursor = conn.cursor()

cursor.execute("PRAGMA table_info(birth_data)")
columns = cursor.fetchall()
print("\nBirth data table columns:")
for col in columns:
    print(f"  {col[1]} - {col[2]}")

conn.close()
print("\nDatabase created successfully!")
