import os
import pytest


@pytest.fixture(autouse=True, scope="session")
def tolerate_windows_temp_unlink():
    if os.name != "nt":
        yield
        return
    original = os.unlink

    def unlink(path):
        try:
            original(path)
        except PermissionError:
            pass

    os.unlink = unlink
    yield
    os.unlink = original
