"""Add kit_dispatched_at to Order

Revision ID: 83dac7b2c2d9
Revises: 083fae28c1aa
Create Date: 2025-01-06 02:31:08.666755

"""
from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision = '83dac7b2c2d9'
down_revision = '083fae28c1aa'
branch_labels = None
depends_on = None

def upgrade():
    op.add_column('order', sa.Column('kit_dispatched_at', sa.String(length=255), server_default='Kit not dispatched yet'))

def downgrade():
    op.drop_column('order', 'kit_dispatched_at')
