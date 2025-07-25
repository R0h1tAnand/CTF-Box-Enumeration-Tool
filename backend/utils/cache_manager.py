"""
Cache management utilities for improving performance.
"""
import time
import json
import logging
import functools
from typing import Dict, Any, Callable, Optional, Tuple, List, Union
from flask import current_app, request

# Configure logging
logger = logging.getLogger(__name__)

class CacheManager:
    """In-memory cache manager for improving performance."""
    
    # Cache storage: {key: (value, expiry_time)}
    _cache: Dict[str, Tuple[Any, float]] = {}
    
    @staticmethod
    def get(key: str) -> Optional[Any]:
        """
        Get a value from the cache.
        
        Args:
            key: Cache key
            
        Returns:
            Cached value or None if not found or expired
        """
        if key not in CacheManager._cache:
            return None
        
        value, expiry_time = CacheManager._cache[key]
        
        # Check if expired
        if expiry_time < time.time():
            # Remove expired item
            del CacheManager._cache[key]
            return None
        
        return value
    
    @staticmethod
    def set(key: str, value: Any, ttl: int = 300) -> None:
        """
        Set a value in the cache.
        
        Args:
            key: Cache key
            value: Value to cache
            ttl: Time to live in seconds (default: 300 seconds / 5 minutes)
        """
        expiry_time = time.time() + ttl
        CacheManager._cache[key] = (value, expiry_time)
    
    @staticmethod
    def delete(key: str) -> None:
        """
        Delete a value from the cache.
        
        Args:
            key: Cache key
        """
        if key in CacheManager._cache:
            del CacheManager._cache[key]
    
    @staticmethod
    def clear() -> None:
        """Clear all cached values."""
        CacheManager._cache.clear()
    
    @staticmethod
    def get_stats() -> Dict[str, Any]:
        """
        Get cache statistics.
        
        Returns:
            Dictionary with cache statistics
        """
        current_time = time.time()
        total_items = len(CacheManager._cache)
        expired_items = sum(1 for _, expiry_time in CacheManager._cache.values() if expiry_time < current_time)
        valid_items = total_items - expired_items
        
        return {
            'total_items': total_items,
            'valid_items': valid_items,
            'expired_items': expired_items
        }
    
    @staticmethod
    def clean_expired() -> int:
        """
        Remove expired items from the cache.
        
        Returns:
            Number of items removed
        """
        current_time = time.time()
        expired_keys = [
            key for key, (_, expiry_time) in CacheManager._cache.items()
            if expiry_time < current_time
        ]
        
        for key in expired_keys:
            del CacheManager._cache[key]
        
        return len(expired_keys)


def cached(ttl: int = 300, key_prefix: str = '') -> Callable:
    """
    Decorator for caching function results.
    
    Args:
        ttl: Time to live in seconds (default: 300 seconds / 5 minutes)
        key_prefix: Prefix for cache key
        
    Returns:
        Decorated function
    """
    def decorator(func: Callable) -> Callable:
        @functools.wraps(func)
        def wrapper(*args: Any, **kwargs: Any) -> Any:
            # Generate cache key
            cache_key = f"{key_prefix}:{func.__name__}:{str(args)}:{str(kwargs)}"
            
            # Try to get from cache
            cached_value = CacheManager.get(cache_key)
            if cached_value is not None:
                logger.debug(f"Cache hit for {cache_key}")
                return cached_value
            
            # Call the function
            result = func(*args, **kwargs)
            
            # Cache the result
            CacheManager.set(cache_key, result, ttl)
            logger.debug(f"Cache miss for {cache_key}, cached for {ttl} seconds")
            
            return result
        
        return wrapper
    
    return decorator


def cached_property(ttl: int = 300) -> Callable:
    """
    Decorator for caching class property results.
    
    Args:
        ttl: Time to live in seconds (default: 300 seconds / 5 minutes)
        
    Returns:
        Decorated property
    """
    def decorator(func: Callable) -> property:
        @functools.wraps(func)
        def wrapper(self: Any) -> Any:
            # Generate cache key
            cache_key = f"property:{self.__class__.__name__}:{id(self)}:{func.__name__}"
            
            # Try to get from cache
            cached_value = CacheManager.get(cache_key)
            if cached_value is not None:
                return cached_value
            
            # Call the function
            result = func(self)
            
            # Cache the result
            CacheManager.set(cache_key, result, ttl)
            
            return result
        
        return property(wrapper)
    
    return decorator


def cached_view(ttl: int = 60, vary_on_headers: List[str] = None) -> Callable:
    """
    Decorator for caching Flask view results.
    
    Args:
        ttl: Time to live in seconds (default: 60 seconds)
        vary_on_headers: List of headers to include in cache key
        
    Returns:
        Decorated view function
    """
    if vary_on_headers is None:
        vary_on_headers = []
    
    def decorator(view_func: Callable) -> Callable:
        @functools.wraps(view_func)
        def wrapper(*args: Any, **kwargs: Any) -> Any:
            # Generate cache key based on view function, args, kwargs, and request
            key_parts = [
                view_func.__name__,
                str(args),
                str(kwargs),
                request.path,
                request.query_string.decode('utf-8')
            ]
            
            # Add specified headers to cache key
            for header in vary_on_headers:
                key_parts.append(f"{header}:{request.headers.get(header, '')}")
            
            # Add user ID if authenticated
            if hasattr(request, 'user_id'):
                key_parts.append(f"user:{request.user_id}")
            
            cache_key = "view:" + ":".join(key_parts)
            
            # Try to get from cache
            cached_value = CacheManager.get(cache_key)
            if cached_value is not None:
                return cached_value
            
            # Call the view function
            result = view_func(*args, **kwargs)
            
            # Cache the result
            CacheManager.set(cache_key, result, ttl)
            
            return result
        
        return wrapper
    
    return decorator


def invalidate_cache_pattern(pattern: str) -> int:
    """
    Invalidate all cache keys matching a pattern.
    
    Args:
        pattern: Pattern to match cache keys
        
    Returns:
        Number of keys invalidated
    """
    invalidated = 0
    for key in list(CacheManager._cache.keys()):
        if pattern in key:
            CacheManager.delete(key)
            invalidated += 1
    
    return invalidated