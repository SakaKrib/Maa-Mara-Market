"""Backward-compatible import for the visitor account merge service.

New code should import merge_visitor_data_to_user from core.services.visitor_merge.
"""
from .services.visitor_merge import merge_visitor_data_to_user

__all__ = ["merge_visitor_data_to_user"]
