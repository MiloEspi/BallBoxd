from django.urls import path
from rest_framework.authtoken.views import obtain_auth_token

from .views import RegisterView

urlpatterns = [
    path("token/", obtain_auth_token, name="token-auth"),
    path("register/", RegisterView.as_view(), name="register"),
]
