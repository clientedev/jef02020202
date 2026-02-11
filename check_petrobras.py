import sqlite3

# Connect to database
conn = sqlite3.connect('temp.db')
cursor = conn.cursor()

# Find Petrobras
print("=== EMPRESAS (Petrobras) ===")
cursor.execute("SELECT id, empresa FROM empresas WHERE empresa LIKE '%petrobras%' OR empresa LIKE '%Petrobras%' LIMIT 5")
empresas = cursor.fetchall()
for emp in empresas:
    print(f"ID: {emp[0]}, Nome: {emp[1]}")

if empresas:
    empresa_id = empresas[0][0]
    
    print(f"\n=== AGENDAMENTOS para empresa_id={empresa_id} (via prospeccoes) ===")
    cursor.execute("""
        SELECT a.id, a.data_agendada, a.status 
        FROM agendamentos a
        JOIN prospeccoes p ON a.prospeccao_id = p.id
        WHERE p.empresa_id = ?
    """, (empresa_id,))
    agendamentos = cursor.fetchall()
    print(f"Total: {len(agendamentos)}")
    for ag in agendamentos[:5]:
        print(f"  ID: {ag[0]}, Data: {ag[1]}, Status: {ag[2]}")
    
    print(f"\n=== CRONOGRAMA EVENTOS para empresa_id={empresa_id} ===")
    cursor.execute("SELECT id, data, categoria, program_id FROM cronograma_eventos WHERE empresa_id = ?", (empresa_id,))
    eventos = cursor.fetchall()
    print(f"Total: {len(eventos)}")
    for ev in eventos[:5]:
        print(f"  ID: {ev[0]}, Data: {ev[1]}, Categoria: {ev[2]}, Program ID: {ev[3]}")
    
    print(f"\n=== PROGRAMS vinculados ===")
    cursor.execute("""
        SELECT DISTINCT p.id, p.nome, p.carga_horaria
        FROM programs p 
        JOIN cronograma_eventos ce ON p.id = ce.program_id 
        WHERE ce.empresa_id = ?
    """, (empresa_id,))
    programs = cursor.fetchall()
    print(f"Total: {len(programs)}")
    for prog in programs:
        print(f"  ID: {prog[0]}, Nome: {prog[1]}, Carga: {prog[2]}h")

conn.close()
