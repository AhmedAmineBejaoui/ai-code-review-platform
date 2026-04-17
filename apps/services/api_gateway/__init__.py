"""API Gateway: single public entrypoint that routes to microservices.

Routes are declared in :mod:`routing`. Until a service is extracted, its
prefix stays mapped to the legacy monolith so the system keeps working
end-to-end.
"""
