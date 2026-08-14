class StockMovement {
  final String id;
  final String type;
  final int quantity;
  final double? unitCost;
  final String? notes;
  final DateTime createdAt;

  final String productName;
  final String productUnit;

  final String? responsibleName;
  final String? responsibleEmail;

  StockMovement({
    required this.id,
    required this.type,
    required this.quantity,
    this.unitCost,
    this.notes,
    required this.createdAt,
    required this.productName,
    required this.productUnit,
    this.responsibleName,
    this.responsibleEmail,
  });

  String get responsible =>
      responsibleName ??
      responsibleEmail ??
      'Sistema';
}