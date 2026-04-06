from sqlalchemy import Column, Date, ForeignKey, Integer, BigInteger, String, Float, Boolean, DateTime, Text, func
from sqlalchemy.orm import relationship, declarative_base

Base = declarative_base()


class User(Base):
    __tablename__ = "users"

    id = Column(BigInteger, primary_key=True)
    first_name = Column(String, nullable=True)
    last_name = Column(String, nullable=True)
    username = Column(String, unique=True, nullable=False)
    budget = Column(Integer)

    created_at = Column(DateTime(timezone=True), server_default=func.now())


class Category(Base):
    __tablename__ = "categories"

    id = Column(Integer, primary_key=True)
    user_id = Column(BigInteger, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    name = Column(String, nullable=False)


class Expense(Base):
    __tablename__ = "expenses"

    id = Column(Integer, primary_key=True)
    user_id = Column(BigInteger, ForeignKey("users.id"), nullable=False)
    category_id = Column(Integer, ForeignKey("categories.id", ondelete="SET NULL"), nullable=True)
    amount = Column(Integer, nullable=False)
    expense_date = Column(Date, nullable=False)
    note = Column(Text, nullable=True)
    import_ref = Column(String, nullable=True)  # "{time}|{card}" for Click imports; NULL for manual
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    user = relationship("User")
    category = relationship("Category")


class ServiceMapping(Base):
    __tablename__ = "service_mappings"

    id = Column(Integer, primary_key=True)
    user_id = Column(BigInteger, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    keyword = Column(String, nullable=False)     # stored lowercase+stripped
    category_id = Column(Integer, ForeignKey("categories.id", ondelete="CASCADE"), nullable=False)

    category = relationship("Category")
