import logging

from rest_framework import status
from rest_framework.response import Response
from rest_framework.views import exception_handler

logger = logging.getLogger(__name__)


class Conflict(Exception):
    """Raised by services for state conflicts (HTTP 409)."""


def api_exception_handler(exc, context):
    if isinstance(exc, Conflict):
        return Response({"detail": str(exc)}, status=status.HTTP_409_CONFLICT)
    response = exception_handler(exc, context)
    if response is None:  # unhandled: never leak a traceback
        logger.exception("Unhandled API error", exc_info=exc)
        return Response(
            {"detail": "An unexpected server error occurred."},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR,
        )
    return response
