# -*- coding: utf-8 -*-
"""Test configuration and fixtures."""
import sys
import os
import pytest
import sqlite3
import tempfile
from pathlib import Path

# Add project root to path
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))


@pytest.fixture
def app():
    """Create test Flask application."""
    # Set up temp database
    db_fd, db_path = tempfile.mkstemp(suffix='.db')

    os.environ['FLASK_SECRET_KEY'] = 'test-secret-key-12345'

    from app import app as flask_app
    flask_app.config.update({
        'TESTING': True,
        'SECRET_KEY': 'test-secret-key-12345',
    })

    yield flask_app

    os.close(db_fd)
    os.unlink(db_path)


@pytest.fixture
def client(app):
    """Create test client."""
    return app.test_client()


@pytest.fixture
def logged_in_client(client, app):
    """Create test client with admin user logged in."""
    with app.app_context():
        with client.session_transaction() as sess:
            sess['usuario_id'] = 1
            sess['usuario_nome'] = 'Admin Test'
            sess['usuario_email'] = 'admin@test.com'
            sess['usuario_perfil'] = 'admin'
    return client
