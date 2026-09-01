import re
from typing import Tuple

def validate_password(password: str) -> Tuple[bool, str]:
    """
    Validates password strength.
    Requires at least 6 characters and at least one letter and one number.
    Returns (is_valid, error_message).
    """
    if not password:
        return False, "Password cannot be empty."
    if len(password) < 8:
        return False, "Password must be at least 8 characters long."
    if not re.search(r"[a-zA-Z]", password):
        return False, "Password must contain at least one letter."
    if not re.search(r"[0-9]", password):
        return False, "Password must contain at least one number."
    return True, ""
