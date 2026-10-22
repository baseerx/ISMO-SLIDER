import io
import os
import shutil
import tempfile

from django.contrib.auth import get_user_model
from django.core.files.uploadedfile import SimpleUploadedFile
from django.test import override_settings
from PIL import Image
from rest_framework.test import APITestCase

from .models import Slider

TMP_MEDIA = tempfile.mkdtemp()


def make_image(name="t.png", fmt="PNG"):
    buf = io.BytesIO()
    Image.new("RGB", (40, 20), "navy").save(buf, fmt)
    return SimpleUploadedFile(name, buf.getvalue(), content_type=f"image/{fmt.lower()}")


@override_settings(MEDIA_ROOT=TMP_MEDIA)
class SliderApiTests(APITestCase):
    @classmethod
    def tearDownClass(cls):
        shutil.rmtree(TMP_MEDIA, ignore_errors=True)
        super().tearDownClass()

    def setUp(self):
        self.user = get_user_model().objects.create_user("admin", password="pass12345")

    def login(self):
        res = self.client.post("/api/auth/login/", {"username": "admin", "password": "pass12345"})
        self.assertEqual(res.status_code, 200)
        self.client.credentials(HTTP_AUTHORIZATION=f"Bearer {res.data['access']}")

    def create(self, name, order, **extra):
        data = {"name": name, "display_order": order, "display_duration": 5, "image": make_image(), **extra}
        return self.client.post("/api/sliders/", data, format="multipart")

    def test_bad_login(self):
        res = self.client.post("/api/auth/login/", {"username": "admin", "password": "x"})
        self.assertEqual(res.status_code, 401)

    def test_admin_endpoints_require_auth(self):
        self.assertEqual(self.client.get("/api/sliders/").status_code, 401)
        self.assertEqual(self.client.get("/api/sliders/active/").status_code, 200)

    def test_public_feed_ignores_stale_token_and_hides_internal_fields(self):
        self.client.credentials(HTTP_AUTHORIZATION="Bearer expired.or.garbage")
        res = self.client.get("/api/sliders/active/")
        self.assertEqual(res.status_code, 200)
        self.assertGreaterEqual(self.client.post("/api/sliders/active/", {}).status_code, 400)
        for item in res.data:
            self.assertNotIn("created_by_name", item)
            self.assertNotIn("is_active", item)

    def test_create_and_insert_shifts_order(self):
        self.login()
        for i, n in enumerate(["A", "B", "C"], 1):
            self.assertEqual(self.create(n, i).status_code, 201)
        self.assertEqual(self.create("D", 2).status_code, 201)
        names = list(Slider.objects.order_by("display_order").values_list("name", flat=True))
        self.assertEqual(names, ["A", "D", "B", "C"])

    def test_image_validation(self):
        self.login()
        bad = SimpleUploadedFile("x.gif", b"GIF89a", content_type="image/gif")
        res = self.client.post(
            "/api/sliders/",
            {"name": "X", "display_order": 1, "display_duration": 5, "image": bad},
            format="multipart",
        )
        self.assertEqual(res.status_code, 400)
        self.assertIn("image", res.data)

    def test_duration_limits(self):
        self.login()
        self.assertEqual(self.create("X", 1, display_duration=999).status_code, 400)

    def test_status_active_filter_and_delete(self):
        self.login()
        a = self.create("A", 1).data["id"]
        self.create("B", 2)
        res = self.client.patch(f"/api/sliders/{a}/status/", {"is_active": False}, format="json")
        self.assertFalse(res.data["is_active"])
        self.assertEqual(len(self.client.get("/api/sliders/active/").data), 1)
        self.assertEqual(self.client.delete(f"/api/sliders/{a}/").status_code, 204)
        self.assertEqual(Slider.objects.get().display_order, 1)

    def test_reorder_and_conflict(self):
        self.login()
        ids = [self.create(n, i).data["id"] for i, n in enumerate("ABC", 1)]
        res = self.client.patch("/api/sliders/reorder/", {"ids": ids[::-1]}, format="json")
        self.assertEqual([s["name"] for s in res.data], ["C", "B", "A"])
        res = self.client.patch("/api/sliders/reorder/", {"ids": ids[:2]}, format="json")
        self.assertEqual(res.status_code, 409)

    def test_new_slider_defaults_to_active_and_patch_keeps_status(self):
        self.login()
        sid = self.create("A", 1).data["id"]
        self.assertTrue(Slider.objects.get(pk=sid).is_active)
        self.client.patch(f"/api/sliders/{sid}/", {"name": "A2"}, format="multipart")
        self.assertTrue(Slider.objects.get(pk=sid).is_active)


def make_video(name="v.mp4", head=b"\x00\x00\x00\x18ftypmp42", content_type="video/mp4"):
    return SimpleUploadedFile(name, head + b"\x00" * 64, content_type=content_type)


@override_settings(MEDIA_ROOT=TMP_MEDIA)
class VideoSliderTests(APITestCase):
    def setUp(self):
        get_user_model().objects.create_user("admin", password="pass12345")
        res = self.client.post("/api/auth/login/", {"username": "admin", "password": "pass12345"})
        self.client.credentials(HTTP_AUTHORIZATION=f"Bearer {res.data['access']}")

    def post(self, **extra):
        data = {"name": "Clip", "media_type": "video", "display_order": 1, "display_duration": 120, "video": make_video(), **extra}
        return self.client.post("/api/sliders/", data, format="multipart")

    def test_video_slide_keeps_its_long_duration(self):
        res = self.post()
        self.assertEqual(res.status_code, 201, res.data)
        self.assertEqual(res.data["display_duration"], 120)
        self.assertTrue(res.data["video"].endswith(".mp4"))

    def test_video_is_required_for_video_slides(self):
        res = self.client.post("/api/sliders/", {"name": "C", "media_type": "video", "display_order": 1, "display_duration": 10}, format="multipart")
        self.assertEqual(res.status_code, 400)
        self.assertIn("video", res.data)

    def test_rejects_bad_video_files(self):
        self.assertEqual(self.post(video=make_video("v.avi", content_type="video/x-msvideo")).status_code, 400)
        self.assertEqual(self.post(video=make_video("v.mp4", head=b"NOTAVIDEO____")).status_code, 400)

    def test_duration_limits_by_media_type(self):
        self.assertEqual(self.post(display_duration=99999).status_code, 400)
        img = {"name": "I", "display_order": 1, "display_duration": 120, "image": make_image()}
        self.assertEqual(self.client.post("/api/sliders/", img, format="multipart").status_code, 400)

    def test_public_api_exposes_media_type_and_video(self):
        self.post()
        self.client.credentials()
        item = self.client.get("/api/sliders/active/").data[0]
        self.assertEqual(item["media_type"], "video")
        self.assertTrue(item["video"])

    def test_switching_to_image_deletes_the_video_file(self):
        sid = self.post().data["id"]
        path = Slider.objects.get(pk=sid).video.path
        self.assertTrue(os.path.exists(path))
        with self.captureOnCommitCallbacks(execute=True):  # file deletion runs after commit
            res = self.client.patch(f"/api/sliders/{sid}/", {"media_type": "image", "display_duration": 5, "image": make_image()}, format="multipart")
        self.assertEqual(res.status_code, 200, res.data)
        self.assertFalse(Slider.objects.get(pk=sid).video)
        self.assertFalse(os.path.exists(path))

    def test_either_image_or_video_is_enough_and_type_is_inferred(self):
        only_video = self.client.post("/api/sliders/", {"name": "V", "display_order": 1, "display_duration": 30, "video": make_video()}, format="multipart")
        self.assertEqual(only_video.status_code, 201, only_video.data)
        self.assertEqual(only_video.data["media_type"], "video")
        only_image = self.client.post("/api/sliders/", {"name": "I", "display_order": 2, "display_duration": 5, "image": make_image()}, format="multipart")
        self.assertEqual(only_image.status_code, 201, only_image.data)
        self.assertEqual(only_image.data["media_type"], "image")

    def test_neither_image_nor_video_is_rejected(self):
        res = self.client.post("/api/sliders/", {"name": "N", "display_order": 1, "display_duration": 5}, format="multipart")
        self.assertEqual(res.status_code, 400)
        self.assertEqual(res.data["image"][0], "Add an image or a video.")

    def test_a_new_video_replaces_the_image_and_needs_no_image(self):
        sid = self.client.post("/api/sliders/", {"name": "I", "display_order": 1, "display_duration": 5, "image": make_image()}, format="multipart").data["id"]
        path = Slider.objects.get(pk=sid).image.path
        with self.captureOnCommitCallbacks(execute=True):
            res = self.client.patch(f"/api/sliders/{sid}/", {"display_duration": 20, "video": make_video()}, format="multipart")
        self.assertEqual(res.status_code, 200, res.data)
        self.assertEqual(res.data["media_type"], "video")
        self.assertIsNone(res.data["image"])
        self.assertFalse(os.path.exists(path))

    def test_video_wins_when_both_files_are_sent(self):
        res = self.client.post("/api/sliders/", {"name": "B", "display_order": 1, "display_duration": 30, "video": make_video(), "image": make_image()}, format="multipart")
        self.assertEqual(res.status_code, 201, res.data)
        self.assertEqual(res.data["media_type"], "video")
        self.assertIsNone(res.data["image"])

    def test_editing_text_keeps_the_video(self):
        sid = self.post().data["id"]
        res = self.client.patch(f"/api/sliders/{sid}/", {"name": "Renamed"}, format="multipart")
        self.assertEqual((res.data["media_type"], bool(res.data["video"])), ("video", True))


    def test_caption_is_hidden_by_default_and_can_be_turned_on(self):
        off = self.post()
        self.assertEqual(off.status_code, 201, off.data)
        self.assertFalse(off.data["show_caption"])
        on = self.post(display_order=2, show_caption="true")
        self.assertTrue(on.data["show_caption"])
        self.client.credentials()
        flags = {i["id"]: i["show_caption"] for i in self.client.get("/api/sliders/active/").data}
        self.assertEqual(sorted(flags.values()), [False, True])

    def test_description_is_optional(self):
        res = self.post(description="")
        self.assertEqual(res.status_code, 201, res.data)

    def test_editing_other_fields_keeps_the_caption_setting(self):
        sid = self.post(show_caption="true").data["id"]
        res = self.client.patch(f"/api/sliders/{sid}/", {"name": "Renamed"}, format="multipart")
        self.assertTrue(res.data["show_caption"])


@override_settings(MEDIA_ROOT=TMP_MEDIA)
class MediaRangeTests(APITestCase):
    def test_range_and_full_responses(self):
        from django.http import Http404
        from django.test import RequestFactory
        from .media import serve_media
        with open(os.path.join(TMP_MEDIA, "x.bin"), "wb") as f:
            f.write(b"0123456789")
        part = serve_media(RequestFactory().get("/media/x.bin", HTTP_RANGE="bytes=2-5"), "x.bin")
        self.assertEqual((part.status_code, b"".join(part.streaming_content), part["Content-Range"]), (206, b"2345", "bytes 2-5/10"))
        tail = serve_media(RequestFactory().get("/media/x.bin", HTTP_RANGE="bytes=-3"), "x.bin")
        self.assertEqual(b"".join(tail.streaming_content), b"789")
        full = serve_media(RequestFactory().get("/media/x.bin"), "x.bin")
        self.assertEqual((full.status_code, full["Accept-Ranges"]), (200, "bytes"))
        with self.assertRaises(Http404):
            serve_media(RequestFactory().get("/media/x"), "../settings.py")