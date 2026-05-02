from fastapi import Request, status
from fastapi.responses import JSONResponse


class AppException(Exception):
    def __init__(self, message: str, status_code: int) -> None:
        super().__init__(message)
        self.message = message
        self.status_code = status_code


class BadRequestException(AppException):
    def __init__(self, message: str) -> None:
        super().__init__(message=message, status_code=status.HTTP_400_BAD_REQUEST)


class UnauthorizedException(AppException):
    def __init__(self, message: str) -> None:
        super().__init__(message=message, status_code=status.HTTP_401_UNAUTHORIZED)


class NotFoundException(AppException):
    def __init__(self, message: str) -> None:
        super().__init__(message=message, status_code=status.HTTP_404_NOT_FOUND)


class TooManyRequestsException(AppException):
    def __init__(self, message: str) -> None:
        super().__init__(message=message, status_code=status.HTTP_429_TOO_MANY_REQUESTS)


async def handle_app_exception(request: Request, error: AppException) -> JSONResponse:
    return JSONResponse(
        status_code=error.status_code,
        content={"detail": error.message},
    )
