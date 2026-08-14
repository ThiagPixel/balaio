class FinancialTransaction {
  final String id;

  // INCOME | EXPENSE
  final String type;

  final String category;
  final String description;

  final double amount;

  final DateTime dueDate;
  DateTime? paidAt;

  // PENDING | PAID | CANCELLED
  String status;

  final String? notes;
  final DateTime createdAt;

  FinancialTransaction({
    required this.id,
    required this.type,
    required this.category,
    required this.description,
    required this.amount,
    required this.dueDate,
    this.paidAt,
    required this.status,
    this.notes,
    required this.createdAt,
  });

  bool get isIncome => type == 'INCOME';

  bool get isExpense => type == 'EXPENSE';

  bool get isPending => status == 'PENDING';

  bool get isPaid => status == 'PAID';

  bool get isCancelled => status == 'CANCELLED';

  bool get isOverdue {
    if (!isPending) return false;

    final now = DateTime.now();

    final today = DateTime(
      now.year,
      now.month,
      now.day,
    );

    final due = DateTime(
      dueDate.year,
      dueDate.month,
      dueDate.day,
    );

    return due.isBefore(today);
  }
}