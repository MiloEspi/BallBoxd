from django.contrib.auth import get_user_model
from django.test import TestCase
from django.urls import reverse
from rest_framework.authtoken.models import Token

from social.models import UserFollow


class UserFollowEndpointsTests(TestCase):
    def setUp(self):
        User = get_user_model()
        self.user = User.objects.create_user(username="alice", password="testpass123")
        self.target = User.objects.create_user(username="bob", password="testpass123")
        self.token = Token.objects.create(user=self.user)

    def _auth_headers(self):
        return {"HTTP_AUTHORIZATION": f"Token {self.token.key}"}

    def test_follow_user_by_username(self):
        url = reverse("user-follow-username", kwargs={"username": "bob"})
        response = self.client.post(url, **self._auth_headers())
        self.assertEqual(response.status_code, 200)
        data = response.json()
        self.assertTrue(data["is_following"])
        self.assertEqual(data["followers"], 1)
        self.assertEqual(data["following"], 0)
        self.assertTrue(
            UserFollow.objects.filter(follower=self.user, following=self.target).exists()
        )

    def test_unfollow_user_by_username(self):
        UserFollow.objects.create(follower=self.user, following=self.target)
        url = reverse("user-follow-username", kwargs={"username": "bob"})
        response = self.client.delete(url, **self._auth_headers())
        self.assertEqual(response.status_code, 200)
        data = response.json()
        self.assertFalse(data["is_following"])
        self.assertEqual(data["followers"], 0)
        self.assertEqual(data["following"], 0)

    def test_cannot_follow_self(self):
        url = reverse("user-follow-username", kwargs={"username": "alice"})
        response = self.client.post(url, **self._auth_headers())
        self.assertEqual(response.status_code, 400)
