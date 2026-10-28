"""Error classes and exception handlers for uniform error envelope."""

from fastapi import FastAPI, Request, status
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse
from pydantic import ValidationError

from app.api.schemas import ErrorBody, ErrorDetail, ErrorEnvelope


# --- Error codes (matching API_SPEC Section 6) ---
class ErrorCode:
    VALIDATION_ERROR = "VALIDATION_ERROR"
    UNKNOWN_REGION = "UNKNOWN_REGION"
    IGNITION_OUT_OF_BOUNDS = "IGNITION_OUT_OF_BOUNDS"
    IGNITION_ON_NON_FUEL = "IGNITION_ON_NON_FUEL"
    SIMULATION_NOT_FOUND = "SIMULATION_NOT_FOUND"
    INTERNAL_ERROR = "INTERNAL_ERROR"


# --- Custom exceptions ---


class AppError(Exception):
    """Base application error with HTTP status and error code."""

    def __init__(
        self,
        code: str,
        message: str,
        status_code: int = status.HTTP_422_UNPROCESSABLE_ENTITY,
        details: list[ErrorDetail] | dict | None = None,
    ) -> None:
        self.code = code
        self.message = message
        self.status_code = status_code
        self.details = details
        super().__init__(message)


class ValidationError(AppError):
    """Validation error (422)."""

    def __init__(
        self,
        message: str,
        details: list[ErrorDetail] | dict | None = None,
    ) -> None:
        super().__init__(
            code=ErrorCode.VALIDATION_ERROR,
            message=message,
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            details=details,
        )


class UnknownRegionError(AppError):
    """Unknown region_id (422)."""

    def __init__(self, region_id: str) -> None:
        super().__init__(
            code=ErrorCode.UNKNOWN_REGION,
            message=f"Unknown region_id: {region_id}",
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            details={"region_id": region_id},
        )


class IgnitionOutOfBoundsError(AppError):
    """Ignition point outside region bbox (422)."""

    def __init__(self, lat: float, lon: float, region_id: str) -> None:
        super().__init__(
            code=ErrorCode.IGNITION_OUT_OF_BOUNDS,
            message=f"Ignition point ({lat}, {lon}) outside region {region_id} bounds",
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            details={"lat": lat, "lon": lon, "region_id": region_id},
        )


class IgnitionOnNonFuelError(AppError):
    """Ignition point on zero-fuel cell (422)."""

    def __init__(self, lat: float, lon: float, row: int, col: int) -> None:
        super().__init__(
            code=ErrorCode.IGNITION_ON_NON_FUEL,
            message=f"Ignition point ({lat}, {lon}) falls on non-fuel cell (row={row}, col={col})",
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            details={"lat": lat, "lon": lon, "row": row, "col": col},
        )


class SimulationNotFoundError(AppError):
    """Simulation ID not found or expired (404)."""

    def __init__(self, sim_id: str) -> None:
        super().__init__(
            code=ErrorCode.SIMULATION_NOT_FOUND,
            message=f"Simulation not found or expired: {sim_id}",
            status_code=status.HTTP_404_NOT_FOUND,
            details={"simulation_id": sim_id},
        )


class InternalError(AppError):
    """Unexpected internal error (500)."""

    def __init__(self, message: str = "Internal server error") -> None:
        super().__init__(
            code=ErrorCode.INTERNAL_ERROR,
            message=message,
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            details=None,
        )


# --- Exception handlers ---


def _build_error_response(
    code: str,
    message: str,
    status_code: int,
    details: list[ErrorDetail] | dict | None = None,
) -> JSONResponse:
    """Build uniform error envelope response."""
    body = ErrorBody(code=code, message=message, details=details)
    envelope = ErrorEnvelope(error=body)
    return JSONResponse(
        status_code=status_code,
        content=envelope.model_dump(mode="json"),
    )


def register_exception_handlers(app: FastAPI) -> None:
    """Register all exception handlers on the FastAPI app."""

    @app.exception_handler(AppError)
    async def app_error_handler(request: Request, exc: AppError) -> JSONResponse:
        return _build_error_response(exc.code, exc.message, exc.status_code, exc.details)

    @app.exception_handler(RequestValidationError)
    async def validation_error_handler(
        request: Request, exc: RequestValidationError
    ) -> JSONResponse:
        # Convert Pydantic validation errors to our format
        details: list[ErrorDetail] = []
        for err in exc.errors():
            # Field path as string
            field = ".".join(str(x) for x in err["loc"])
            issue = err["type"]
            details.append(ErrorDetail(field=field, issue=issue))
        return _build_error_response(
            ErrorCode.VALIDATION_ERROR,
            "Request validation failed",
            status.HTTP_422_UNPROCESSABLE_ENTITY,
            details,
        )

    @app.exception_handler(ValidationError)
    async def pydantic_validation_error_handler(
        request: Request, exc: ValidationError
    ) -> JSONResponse:
        details: list[ErrorDetail] = []
        for err in exc.errors():
            field = ".".join(str(x) for x in err["loc"])
            issue = err["type"]
            details.append(ErrorDetail(field=field, issue=issue))
        return _build_error_response(
            ErrorCode.VALIDATION_ERROR,
            "Validation failed",
            status.HTTP_422_UNPROCESSABLE_ENTITY,
            details,
        )

    @app.exception_handler(Exception)
    async def generic_error_handler(request: Request, exc: Exception) -> JSONResponse:
        # Log the exception here in production
        return _build_error_response(
            ErrorCode.INTERNAL_ERROR,
            "Internal server error",
            status.HTTP_500_INTERNAL_SERVER_ERROR,
            None,
        )
