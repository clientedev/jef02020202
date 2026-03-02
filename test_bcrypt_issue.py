from passlib.context import CryptContext
import bcrypt

print(f"Bcrypt version: {bcrypt.__version__}")
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

password = "test_password"
# This is a sample hash format
sample_hash = pwd_context.hash(password)
print(f"Generated hash: {sample_hash}")

try:
    is_valid = pwd_context.verify(password, sample_hash)
    print(f"Verification success: {is_valid}")
except Exception as e:
    print(f"Verification failed with error: {type(e).__name__}: {str(e)}")

# Test with a potentially problematic hash (e.g. from the DB)
# Let's use one of the hashes I saw in the DB
db_hash = "$2b$12$7kAIUnhwhWYwkEb5YiJ/eYkdyLcAIU" # truncated hash from before, but let's try a full one if possible
# Since I don't have the full hash, I'll just use the generated one to see if it works with the current environment.
