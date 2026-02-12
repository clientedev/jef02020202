def fix_line_endings(filename):
    with open(filename, 'rb') as f:
        content = f.read()
    
    # Replace CRLF with LF
    content = content.replace(b'\r\n', b'\n')
    
    with open(filename, 'wb') as f:
        f.write(content)
    print(f"✅ Fixed line endings for {filename}")

if __name__ == "__main__":
    fix_line_endings('docker-entrypoint.sh')
    fix_line_endings('main_ghost.py')
    fix_line_endings('start.sh')
