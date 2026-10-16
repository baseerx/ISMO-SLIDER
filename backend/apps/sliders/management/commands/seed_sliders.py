"""Create SAMPLE sliders with generated placeholder images.

Usage: python manage.py seed_sliders [--reset]
"""
import io

from django.core.files.base import ContentFile
from django.core.management.base import BaseCommand
from PIL import Image, ImageDraw

from apps.sliders import services
from apps.sliders.models import Slider

SAMPLES = [
    ("Welcome to ISMO", "Independent System and Market Operator: ensuring transparency, reliability and efficiency in Pakistan's electricity market.", 5, (11, 31, 58)),
    ("Market Operations", "Day-ahead and real-time market operations coordinated with accuracy and fairness.", 6, (18, 41, 77)),
    ("Power Market", "A competitive wholesale power market that supports reliable supply for every consumer.", 8, (27, 58, 107)),
    ("Regulatory Updates", "Stay informed on the latest rules, procedures and market notices.", 4, (7, 20, 38)),
]


def placeholder(title, color):
    img = Image.new("RGB", (1920, 700), color)
    draw = ImageDraw.Draw(img)
    for y in range(700):  # simple vertical gradient
        shade = tuple(min(255, c + y // 12) for c in color)
        draw.line([(0, y), (1920, y)], fill=shade)
    draw.text((80, 280), title, fill="white")
    draw.text((80, 330), "SAMPLE DATA - replace with a real banner", fill=(180, 200, 230))
    buf = io.BytesIO()
    img.save(buf, "JPEG", quality=85)
    return ContentFile(buf.getvalue())


class Command(BaseCommand):
    help = "Seed sample slider data (clearly marked as sample)."

    def add_arguments(self, parser):
        parser.add_argument("--reset", action="store_true", help="Delete all existing sliders first.")

    def handle(self, *args, **opts):
        if opts["reset"]:
            for slider in Slider.objects.all():
                services.delete_slider(slider)
        elif Slider.objects.exists():
            self.stdout.write(self.style.WARNING("Sliders already exist. Use --reset to replace them."))
            return
        for order, (name, desc, duration, color) in enumerate(SAMPLES, start=1):
            slider = Slider(name=name, description=f"[Sample] {desc}", display_order=order, display_duration=duration)
            slider.image.save(f"{order}.jpg", placeholder(name, color), save=False)
            slider.save()
        self.stdout.write(self.style.SUCCESS(f"Created {len(SAMPLES)} sample sliders."))
