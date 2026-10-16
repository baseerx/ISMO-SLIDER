from django.contrib import admin

from .models import Slider


@admin.register(Slider)
class SliderAdmin(admin.ModelAdmin):
    list_display = ("name", "display_order", "display_duration", "is_active", "updated_at")
    list_filter = ("is_active",)
    search_fields = ("name",)
