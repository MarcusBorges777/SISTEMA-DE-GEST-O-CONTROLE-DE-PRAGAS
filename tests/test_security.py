# -*- coding: utf-8 -*-
"""Tests for global security (before_request middleware)."""
import pytest


class TestProtecaoGlobal:
    """All routes must require authentication except public ones."""

    # === ROTAS PÚBLICAS (devem funcionar sem login) ===

    def test_login_page_is_public(self, client):
        response = client.get('/login')
        assert response.status_code == 200

    def test_logout_is_public(self, client):
        response = client.get('/logout')
        assert response.status_code == 302
        assert '/login' in response.headers.get('Location', '')

    # === PÁGINAS PROTEGIDAS (redirect para login) ===

    @pytest.mark.parametrize("url", [
        '/',
        '/dashboard',
        '/clientes',
        '/empresas',
        '/gerar',
        '/documentos',
        '/prospeccao',
        '/gerador/recibo',
        '/gerador/orcamento',
        '/admin/usuarios',
    ])
    def test_pages_redirect_without_login(self, client, url):
        response = client.get(url)
        assert response.status_code == 302, f"{url} should redirect but got {response.status_code}"
        assert '/login' in response.headers.get('Location', ''), f"{url} should redirect to login"

    # === APIS PROTEGIDAS (retornam 401 JSON) ===

    @pytest.mark.parametrize("url", [
        '/api/clientes',
        '/api/tags',
        '/api/boletos',
        '/api/documentos',
        '/api/documentos-gerados',
        '/api/modelos/listar',
        '/api/orcamentos',
        '/api/arquivos',
        '/api/garantias/vencimentos',
        '/api/garantias/vencendo',
        '/api/boletos/vencendo',
        '/api/empresas',
        '/api/analise-financeira',
        '/api/ia-status',
        '/api/pdfs-processados',
    ])
    def test_api_returns_401_without_login(self, client, url):
        response = client.get(url)
        assert response.status_code == 401, f"{url} should return 401 but got {response.status_code}"
        data = response.get_json()
        assert 'erro' in data

    @pytest.mark.parametrize("url,method", [
        ('/api/clientes', 'POST'),
        ('/api/tags', 'POST'),
        ('/api/boletos', 'POST'),
        ('/api/upload', 'POST'),
        ('/api/sincronizar-arquivos', 'POST'),
        ('/api/empresa/sync', 'POST'),
        ('/api/ia-consulta', 'POST'),
        ('/api/tags/adicionar', 'POST'),
        ('/api/tags/remover', 'POST'),
        ('/api/cnae/formatar', 'POST'),
    ])
    def test_api_post_returns_401_without_login(self, client, url, method):
        response = client.post(url, json={})
        assert response.status_code == 401, f"POST {url} should return 401 but got {response.status_code}"

    # === ROTAS ADMIN (retornam 403 para usuário comum) ===

    @pytest.mark.parametrize("url", [
        '/api/database/tables',
        '/api/config/tema',
        '/api/config/logo-mascote',
        '/api/layouts-conhecidos',
        '/api/usuarios',
        '/api/obter-diretorios',
    ])
    def test_admin_routes_return_403_for_regular_user(self, logged_in_user_client, url):
        response = logged_in_user_client.get(url)
        assert response.status_code == 403, f"{url} should return 403 for non-admin but got {response.status_code}"

    @pytest.mark.parametrize("url", [
        '/api/database/tables',
        '/api/config/tema',
        '/api/config/logo-mascote',
        '/api/layouts-conhecidos',
        '/api/usuarios',
    ])
    def test_admin_routes_accessible_by_admin(self, logged_in_client, url):
        response = logged_in_client.get(url)
        assert response.status_code == 200, f"{url} should be accessible by admin but got {response.status_code}"

    # === APIS COM LOGIN NORMAL (devem funcionar) ===

    @pytest.mark.parametrize("url", [
        '/api/clientes',
        '/api/tags',
        '/api/boletos',
        '/api/documentos-gerados',
        '/api/modelos/listar',
        '/api/orcamentos',
        '/api/boletos/vencendo',
        '/api/ia-status',
    ])
    def test_api_accessible_when_logged_in(self, logged_in_client, url):
        response = logged_in_client.get(url)
        assert response.status_code == 200, f"{url} should be accessible when logged in but got {response.status_code}"


class TestResetAdmin:
    """Tests for reset-admin security."""

    def test_reset_admin_blocked_when_users_exist_and_not_logged_in(self, client, app):
        """Anonymous users can't reset admin when users exist."""
        response = client.get('/reset-admin')
        assert response.status_code == 302

    def test_reset_admin_accessible_by_admin(self, logged_in_client):
        """Admin can reset admin credentials."""
        response = logged_in_client.get('/reset-admin')
        assert response.status_code == 302  # Redirects to login after reset


class TestSessionSecurity:
    """Tests for session configuration."""

    def test_session_cookie_httponly(self, app):
        assert app.config['SESSION_COOKIE_HTTPONLY'] is True

    def test_session_cookie_samesite(self, app):
        assert app.config['SESSION_COOKIE_SAMESITE'] == 'Lax'

    def test_secret_key_is_set(self, app):
        assert app.config['SECRET_KEY'] is not None
        assert len(app.config['SECRET_KEY']) > 10
