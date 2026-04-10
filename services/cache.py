from time import time

# Sistema de cache em memória otimizado
class SimpleCache:
    """Cache simples em memória com TTL"""
    def __init__(self, ttl=300):
        self.cache = {}
        self.ttl = ttl

    def get(self, key):
        if key in self.cache:
            value, timestamp = self.cache[key]
            if time() - timestamp < self.ttl:
                return value
            else:
                del self.cache[key]
        return None

    def set(self, key, value):
        self.cache[key] = (value, time())

    def clear(self):
        self.cache.clear()

    def invalidate(self, pattern=None):
        if pattern is None:
            self.cache.clear()
        else:
            keys_to_delete = [k for k in self.cache.keys() if pattern in k]
            for k in keys_to_delete:
                del self.cache[k]

# Instâncias de cache com diferentes TTLs
cache_api = SimpleCache(ttl=60)  # Cache de APIs - 1 minuto
cache_queries = SimpleCache(ttl=300)  # Cache de queries - 5 minutos
cache_tags = SimpleCache(ttl=600)  # Cache de tags - 10 minutos
