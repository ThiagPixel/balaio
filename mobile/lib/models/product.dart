class Product {
  final String id;
  String name;
  String? sku;
  String? description;
  String unit;
  double? costPrice;
  double salePrice;
  int currentStock;
  int minStock;
  bool active;
  String? imageUrl;

  Product({
    required this.id,
    required this.name,
    this.sku,
    this.description,
    this.unit = 'un',
    this.costPrice,
    required this.salePrice,
    this.currentStock = 0,
    this.minStock = 0,
    this.active = true,
    this.imageUrl,
  });

  bool get lowStock =>
      minStock > 0 && currentStock <= minStock;
}