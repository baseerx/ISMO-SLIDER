import mimetypes
import os
import re

from django.conf import settings
from django.core.exceptions import SuspiciousFileOperation
from django.http import FileResponse, Http404, HttpResponse, StreamingHttpResponse
from django.utils._os import safe_join


def _chunks(path, start, length, size=64 * 1024):
    with open(path, "rb") as f:
        f.seek(start)
        while length > 0:
            data = f.read(min(size, length))
            if not data:
                break
            length -= len(data)
            yield data


def serve_media(request, path):
    try:
        full = safe_join(settings.MEDIA_ROOT, path)
    except (SuspiciousFileOperation, ValueError):
        raise Http404
    if not os.path.isfile(full):
        raise Http404
    total = os.path.getsize(full)
    ctype = mimetypes.guess_type(full)[0] or "application/octet-stream"
    m = re.fullmatch(r"bytes=(\d*)-(\d*)", request.headers.get("Range", "").strip())
    if not m or not (m.group(1) or m.group(2)):
        resp = FileResponse(open(full, "rb"), content_type=ctype)
        resp["Accept-Ranges"] = "bytes"
        return resp
    if m.group(1):
        start = int(m.group(1))
        end = int(m.group(2)) if m.group(2) else total - 1
    else:  # suffix range: the last N bytes
        start, end = max(total - int(m.group(2)), 0), total - 1
    end = min(end, total - 1)
    if start > end or start >= total:
        resp = HttpResponse(status=416)
        resp["Content-Range"] = f"bytes */{total}"
        return resp
    resp = StreamingHttpResponse(_chunks(full, start, end - start + 1), status=206, content_type=ctype)
    resp["Content-Range"] = f"bytes {start}-{end}/{total}"
    resp["Content-Length"] = str(end - start + 1)
    resp["Accept-Ranges"] = "bytes"
    return resp