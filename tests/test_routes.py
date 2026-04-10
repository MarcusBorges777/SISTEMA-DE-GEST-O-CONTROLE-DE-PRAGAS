# -*- coding: utf-8 -*-
"""Tests for Flask routes."""
import pytest


class TestAuthRoutes:
    """Tests for authentication routes."""

    def test_login_page_renders(self, client):
        response = client.get('/login')
        assert response.status_code == 200

    def test_login_redirect_when_logged_in(self, logged_in_client):
        response = logged_in_client.get('/login')
        assert response.status_code == 302  # Redirect to dashboard

    def test_logout_clears_session(self, logged_in_client):
        response = logged_in_client.get('/logout')
        assert response.status_code == 302
        # Should redirect to login
        assert '/login' in response.headers.get('Location', '')

    def test_index_requires_login(self, client):
        response = client.get('/')
        assert response.status_code == 302  # Redirect to login

    def test_dashboard_requires_login(self, client):
        response = client.get('/dashboard')
        assert response.status_code == 302

    def test_dashboard_accessible_when_logged_in(self, logged_in_client):
        response = logged_in_client.get('/dashboard')
        assert response.status_code == 200

    def test_gerador_recibo_requires_login(self, client):
        response = client.get('/gerador/recibo')
        assert response.status_code == 302

    def test_gerador_orcamento_requires_login(self, client):
        response = client.get('/gerador/orcamento')
        assert response.status_code == 302

    def test_gerador_laudo_requires_login(self, client):
        response = client.get('/gerador/laudo')
        assert response.status_code == 302


class TestSegurancaGlobal:
    """Tests for global security (before_request)."""

    def test_api_returns_401_without_login(self, client):
        """API routes return 401 JSON when not authenticated."""
        response = client.get('/api/clientes')
        assert response.status_code == 401
        data = response.get_json()
        assert 'erro' in data
        assert 'Autenticação' in data['erro']

    def test_page_redirects_without_login(self, client):
        """Page routes redirect to login when not authenticated."""
        response = client.get('/clientes')
        assert response.status_code == 302
        assert '/login' in response.headers.get('Location', '')

    def test_api_boletos_requires_login(self, client):
        response = client.get('/api/boletos')
        assert response.status_code == 401

    def test_api_tags_requires_login(self, client):
        response = client.get('/api/tags')
        assert response.status_code == 401

    def test_admin_routes_require_admin_profile(self, logged_in_user_client):
        """Non-admin users get 403 on admin routes."""
        response = logged_in_user_client.get('/api/database/tables')
        assert response.status_code == 403
        data = response.get_json()
        assert 'Acesso negado' in data['erro']

    def test_admin_routes_accessible_by_admin(self, logged_in_client):
        """Admin users can access admin routes."""
        response = logged_in_client.get('/api/database/tables')
        assert response.status_code == 200

    def test_reset_admin_blocked_for_anonymous(self, client, app):
        """reset-admin blocked when users exist and not logged in."""
        with app.app_context():
            response = client.get('/reset-admin')
            assert response.status_code == 302  # Redirects to login


class TestApiRoutes:
    """Tests for API routes (with authentication)."""

    def test_api_clientes_get(self, logged_in_client):
        response = logged_in_client.get('/api/clientes')
        assert response.status_code == 200
        data = response.get_json()
        assert isinstance(data, list)

    def test_api_clientes_post_missing_name(self, logged_in_client):
        response = logged_in_client.post('/api/clientes',
            json={'nome_fantasia': ''},
            content_type='application/json')
        assert response.status_code == 400

    def test_api_clientes_post_valid(self, logged_in_client):
        response = logged_in_client.post('/api/clientes',
            json={
                'nome_fantasia': 'Empresa Teste',
                'cnpj': '12345678000190',
                'cidade': 'Divinópolis',
                'uf': 'MG'
            },
            content_type='application/json')
        assert response.status_code == 200
        data = response.get_json()
        assert data.get('message') == 'Cliente salvo!'

    def test_api_tags_get(self, logged_in_client):
        response = logged_in_client.get('/api/tags')
        assert response.status_code == 200
        data = response.get_json()
        assert isinstance(data, list)
        # Should have default tags
        tag_names = [t['nome'] for t in data]
        assert 'Laudo' in tag_names
        assert 'Recibo' in tag_names

    def test_api_boletos_get(self, logged_in_client):
        response = logged_in_client.get('/api/boletos')
        assert response.status_code == 200
        data = response.get_json()
        assert isinstance(data, list)

    def test_api_config_tema_get(self, logged_in_client):
        """Config tema requires admin."""
        response = logged_in_client.get('/api/config/tema')
        assert response.status_code == 200

    def test_api_database_tables(self, logged_in_client):
        """Database tables requires admin."""
        response = logged_in_client.get('/api/database/tables')
        assert response.status_code == 200
        data = response.get_json()
        assert isinstance(data, list)
        if data:
            first = data[0]
            key = 'name' if 'name' in first else 'tabela' if 'tabela' in first else list(first.keys())[0]
            table_names = [t[key] for t in data]
            assert 'clientes_web' in table_names


class TestUserManagementApi:
    """Tests for user management API."""

    def test_usuarios_requires_login(self, client):
        """Without login, API returns 401."""
        response = client.get('/api/usuarios')
        assert response.status_code == 401

    def test_usuarios_requires_admin(self, logged_in_user_client):
        """Non-admin user gets 403."""
        response = logged_in_user_client.get('/api/usuarios')
        assert response.status_code == 403

    def test_listar_usuarios(self, logged_in_client):
        response = logged_in_client.get('/api/usuarios')
        assert response.status_code == 200
        data = response.get_json()
        assert isinstance(data, list)
        assert len(data) >= 1  # At least admin user
