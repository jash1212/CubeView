import psycopg2

conn = psycopg2.connect(
    dbname="neondb",
    user="neondb_owner",
    password="npg_T1fPZ2BtRjYu",
    host="ep-weathered-darkness-a83rga7f-pooler.eastus2.azure.neon.tech",
    port=5432,
    sslmode="require"
)

cur = conn.cursor()

# Get tables
cur.execute("SELECT table_name FROM information_schema.tables WHERE table_schema = 'public';")
tables = cur.fetchall()

# Get columns
cur.execute("""
SELECT table_name, column_name, data_type
FROM information_schema.columns
WHERE table_schema = 'public';
""")
columns = cur.fetchall()

# Get foreign keys
cur.execute("""
SELECT
    tc.table_name AS source_table,
    kcu.column_name AS source_column,
    ccu.table_name AS target_table,
    ccu.column_name AS target_column
FROM
    information_schema.table_constraints AS tc
    JOIN information_schema.key_column_usage AS kcu
      ON tc.constraint_name = kcu.constraint_name
    JOIN information_schema.constraint_column_usage AS ccu
      ON ccu.constraint_name = tc.constraint_name
WHERE constraint_type = 'FOREIGN KEY';
""")
fks = cur.fetchall()

print("\n📦 Tables:\n", tables)
print("\n🔍 Columns:\n", columns)
print("\n🔗 Foreign Keys:\n", fks)

cur.close()
conn.close()
