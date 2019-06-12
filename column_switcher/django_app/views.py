from urllib.parse import urlparse

from django.contrib import auth
from django.contrib.auth import authenticate, login, logout
from django.contrib.auth.forms import AuthenticationForm
from django.shortcuts import render, redirect, render_to_response

# Create your views here.


# helper method to generate a context csrf_token
# and adding a login form in this context
from django.template.context_processors import csrf
from django.utils.http import urlunquote, is_safe_url
from django.views import View

from . import i


def index(request):
    return render(request, __name__.split(".")[i - 1] + "_index.html")


class Advanced_Settings(View):
    def get(self,request):
        return render(request, "column_switcher_advanced_settings.html")