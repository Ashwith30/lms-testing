import os
import sys
from logging.config import fileConfig
from sqlalchemy import pool
from alembic import context

# Ensure backend directory is in path
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from database import engine, DATABASE_URL
import models

# this is the Alembic Config object, which provides
# access to the values within the .ini file in use.
config = context.config

# Interpret the config file for Python logging.
if config.config_file_name is not None:
    fileConfig(config.config_file_name)

target_metadata = models.Base.metadata


def run_migrations_offline() -> None:
    """Run migrations in 'offline' mode."""
    context.configure(
        url=DATABASE_URL,
        target_metadata=target_metadata,
        literal_binds=True,
        dialect_opts={"paramstyle": "named"},
    )

    with context.begin_transaction():
        context.run_migrations()


def run_migrations_online() -> None:
    """Run migrations in 'online' mode using the configured engine or connection."""
    connectable = config.attributes.get("connection", None)
    if connectable is None:
        url = config.get_main_option("sqlalchemy.url")
        if url and not url.startswith("driver://") and not url.startswith("sqlite:///./lms.db"):
            from sqlalchemy import create_engine
            connectable = create_engine(url)
        else:
            connectable = engine

    with connectable.connect() as connection:
        context.configure(
            connection=connection,
            target_metadata=target_metadata,
            render_as_batch=True if connection.dialect.name == "sqlite" else False
        )

        with context.begin_transaction():
            context.run_migrations()



if context.is_offline_mode():
    run_migrations_offline()
else:
    run_migrations_online()

