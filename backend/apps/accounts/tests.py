from django.contrib.auth import get_user_model
from rest_framework.test import APITestCase


class AuthTests(APITestCase):
    def setUp(self):
        get_user_model().objects.create_user("admin", email="a@ismo.test", password="pass12345")

    def login(self):
        return self.client.post("/api/auth/login/", {"username": "admin", "password": "pass12345"})

    def test_login_returns_tokens_and_user(self):
        res = self.login()
        self.assertEqual(res.status_code, 200)
        self.assertEqual(res.data["user"]["username"], "admin")
        self.assertIn("access", res.data)
        self.assertIn("refresh", res.data)

    def test_login_failure_message(self):
        res = self.client.post("/api/auth/login/", {"username": "admin", "password": "bad"})
        self.assertEqual(res.status_code, 401)
        self.assertEqual(res.data["detail"], "Invalid username or password.")

    def test_refresh_rotates_token(self):
        refresh = self.login().data["refresh"]
        res = self.client.post("/api/auth/refresh/", {"refresh": refresh})
        self.assertEqual(res.status_code, 200)
        self.assertIn("access", res.data)

    def test_logout_blacklists_refresh(self):
        data = self.login().data
        self.client.credentials(HTTP_AUTHORIZATION=f"Bearer {data['access']}")
        self.assertEqual(self.client.post("/api/auth/logout/", {"refresh": data["refresh"]}).status_code, 205)
        self.client.credentials()
        self.assertEqual(self.client.post("/api/auth/refresh/", {"refresh": data["refresh"]}).status_code, 401)

    def test_me_requires_auth(self):
        self.assertEqual(self.client.get("/api/auth/me/").status_code, 401)
