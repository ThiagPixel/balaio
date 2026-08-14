import 'package:flutter/material.dart';

import '../../models/product.dart';
import '../../theme/app_colors.dart';
import '../../widgets/ui/app_badge.dart';
import '../../widgets/ui/app_button.dart';
import 'product_form_page.dart';

class ProductsPage extends StatefulWidget {
  const ProductsPage({super.key});

  @override
  State<ProductsPage> createState() => _ProductsPageState();
}

class _ProductsPageState extends State<ProductsPage> {
  final _searchController = TextEditingController();

  Product? editingProduct;
  bool showingForm = false;

  final List<Product> products = [
    Product(
      id: '1',
      name: 'Papel A4',
      sku: 'PAP-A4',
      unit: 'pct',
      costPrice: 22.50,
      salePrice: 29.90,
      currentStock: 4,
      minStock: 10,
    ),
    Product(
      id: '2',
      name: 'Caneta azul',
      sku: 'CAN-AZ',
      unit: 'un',
      costPrice: 1.20,
      salePrice: 2.50,
      currentStock: 40,
      minStock: 20,
    ),
    Product(
      id: '3',
      name: 'Copo descartável',
      sku: null,
      unit: 'pct',
      costPrice: 6.80,
      salePrice: 10,
      currentStock: 12,
      minStock: 50,
    ),
    Product(
      id: '4',
      name: 'Produto antigo',
      sku: 'OLD-001',
      unit: 'un',
      costPrice: 5,
      salePrice: 10,
      currentStock: 2,
      minStock: 0,
      active: false,
    ),
  ];

  String query = '';

  List<Product> get filteredProducts {
    final normalized = query.trim().toLowerCase();

    if (normalized.isEmpty) {
      return products;
    }

    return products.where((product) {
      return product.name.toLowerCase().contains(normalized) ||
          (product.sku?.toLowerCase().contains(normalized) ??
              false);
    }).toList();
  }

  void openNewProduct() {
    setState(() {
      editingProduct = null;
      showingForm = true;
    });
  }

  void openEditProduct(Product product) {
    setState(() {
      editingProduct = product;
      showingForm = true;
    });
  }

  void closeForm() {
    setState(() {
      editingProduct = null;
      showingForm = false;
    });
  }

  void saveProduct(Product product) {
    setState(() {
      final index = products.indexWhere(
        (item) => item.id == product.id,
      );

      if (index >= 0) {
        products[index] = product;
      } else {
        products.add(product);
      }

      showingForm = false;
      editingProduct = null;
    });
  }

  void toggleProduct(Product product) {
    setState(() {
      product.active = !product.active;
    });
  }

  Future<void> deleteProduct(Product product) async {
    final confirmed = await showDialog<bool>(
      context: context,
      builder: (context) {
        return AlertDialog(
          title: const Text('Excluir produto?'),
          content: Text(
            'Excluir "${product.name}"? '
            'Esta ação não pode ser desfeita.',
          ),
          actions: [
            TextButton(
              onPressed: () {
                Navigator.pop(context, false);
              },
              child: const Text('Cancelar'),
            ),
            FilledButton(
              onPressed: () {
                Navigator.pop(context, true);
              },
              style: FilledButton.styleFrom(
                backgroundColor: AppColors.red600,
              ),
              child: const Text('Excluir'),
            ),
          ],
        );
      },
    );

    if (confirmed != true) return;

    setState(() {
      products.remove(product);
    });
  }

  @override
  Widget build(BuildContext context) {
    if (showingForm) {
      return ProductFormPage(
        product: editingProduct,
        onBack: closeForm,
        onSave: saveProduct,
      );
    }

    return ColoredBox(
      color: AppColors.slate50,
      child: SingleChildScrollView(
        padding: const EdgeInsets.all(24),
        child: LayoutBuilder(
          builder: (context, constraints) {
            final desktop = constraints.maxWidth >= 760;

            return Column(
              crossAxisAlignment: CrossAxisAlignment.stretch,
              children: [
                _Header(
                  onNewProduct: openNewProduct,
                ),

                const SizedBox(height: 24),

                _SearchBar(
                  controller: _searchController,
                  onSearch: () {
                    setState(() {
                      query = _searchController.text;
                    });
                  },
                ),

                const SizedBox(height: 24),

                if (filteredProducts.isEmpty)
                  _EmptyState(
                    onNewProduct: openNewProduct,
                  )
                else if (desktop)
                  _ProductsTable(
                    products: filteredProducts,
                    onEdit: openEditProduct,
                    onToggle: toggleProduct,
                    onDelete: deleteProduct,
                  )
                else
                  _ProductsCards(
                    products: filteredProducts,
                    onEdit: openEditProduct,
                    onToggle: toggleProduct,
                    onDelete: deleteProduct,
                  ),
              ],
            );
          },
        ),
      ),
    );
  }
}

class _Header extends StatelessWidget {
  final VoidCallback onNewProduct;

  const _Header({
    required this.onNewProduct,
  });

  @override
  Widget build(BuildContext context) {
    return LayoutBuilder(
      builder: (context, constraints) {
        final compact = constraints.maxWidth < 550;

        final title = Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(
              'Produtos',
              style: Theme.of(context)
                  .textTheme
                  .headlineMedium
                  ?.copyWith(
                    fontWeight: FontWeight.w700,
                    color: AppColors.slate900,
                  ),
            ),
            const SizedBox(height: 4),
            const Text(
              'Cadastre e gerencie seus produtos',
              style: TextStyle(
                fontSize: 14,
                color: AppColors.slate500,
              ),
            ),
          ],
        );

        final button = AppButton(
          text: '+ Novo produto',
          onPressed: onNewProduct,
        );

        if (compact) {
          return Column(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              title,
              const SizedBox(height: 12),
              button,
            ],
          );
        }

        return Row(
          mainAxisAlignment: MainAxisAlignment.spaceBetween,
          children: [
            title,
            button,
          ],
        );
      },
    );
  }
}

class _SearchBar extends StatelessWidget {
  final TextEditingController controller;
  final VoidCallback onSearch;

  const _SearchBar({
    required this.controller,
    required this.onSearch,
  });

  @override
  Widget build(BuildContext context) {
    return Row(
      children: [
        ConstrainedBox(
          constraints: const BoxConstraints(
            maxWidth: 384,
          ),
          child: TextField(
            controller: controller,
            textInputAction: TextInputAction.search,
            onSubmitted: (_) => onSearch(),
            style: const TextStyle(fontSize: 14),
            decoration: InputDecoration(
              hintText: 'Buscar por nome ou SKU...',
              hintStyle: const TextStyle(
                color: AppColors.slate400,
              ),
              isDense: true,
              filled: true,
              fillColor: Colors.white,
              contentPadding: const EdgeInsets.symmetric(
                horizontal: 12,
                vertical: 11,
              ),
              enabledBorder: OutlineInputBorder(
                borderRadius: BorderRadius.circular(6),
                borderSide: const BorderSide(
                  color: AppColors.slate300,
                ),
              ),
              focusedBorder: OutlineInputBorder(
                borderRadius: BorderRadius.circular(6),
                borderSide: const BorderSide(
                  color: AppColors.brand500,
                ),
              ),
            ),
          ),
        ),

        const SizedBox(width: 8),

        OutlinedButton(
          onPressed: onSearch,
          child: const Text('Buscar'),
        ),
      ],
    );
  }
}

class _ProductsTable extends StatelessWidget {
  final List<Product> products;
  final ValueChanged<Product> onEdit;
  final ValueChanged<Product> onToggle;
  final ValueChanged<Product> onDelete;

  const _ProductsTable({
    required this.products,
    required this.onEdit,
    required this.onToggle,
    required this.onDelete,
  });

  String money(double? value) {
    return 'R\$ ${(value ?? 0).toStringAsFixed(2).replaceAll('.', ',')}';
  }

  @override
  Widget build(BuildContext context) {
    return Container(
      clipBehavior: Clip.antiAlias,
      decoration: BoxDecoration(
        color: Colors.white,
        border: Border.all(
          color: AppColors.slate200,
        ),
        borderRadius: BorderRadius.circular(8),
      ),
      child: SingleChildScrollView(
        scrollDirection: Axis.horizontal,
        child: DataTable(
          headingRowColor: WidgetStateProperty.all(
            AppColors.slate50,
          ),
          columns: const [
            DataColumn(label: Text('FOTO')),
            DataColumn(label: Text('PRODUTO')),
            DataColumn(label: Text('SKU')),
            DataColumn(
              label: Text('CUSTO'),
              numeric: true,
            ),
            DataColumn(
              label: Text('VENDA'),
              numeric: true,
            ),
            DataColumn(label: Text('ESTOQUE')),
            DataColumn(label: Text('AÇÕES')),
          ],
          rows: products.map((product) {
            return DataRow(
              color: WidgetStateProperty.resolveWith(
                (_) => product.active
                    ? Colors.white
                    : AppColors.slate50,
              ),
              cells: [
                DataCell(
                  _ProductImage(
                    product: product,
                    size: 48,
                  ),
                ),

                DataCell(
                  Row(
                    children: [
                      Text(
                        product.name,
                        style: const TextStyle(
                          fontWeight: FontWeight.w500,
                        ),
                      ),
                      if (!product.active) ...[
                        const SizedBox(width: 8),
                        const AppBadge(
                          text: 'Inativo',
                        ),
                      ],
                    ],
                  ),
                ),

                DataCell(
                  Text(product.sku ?? '—'),
                ),

                DataCell(
                  Text(
                    money(product.costPrice),
                  ),
                ),

                DataCell(
                  Text(
                    money(product.salePrice),
                    style: const TextStyle(
                      fontWeight: FontWeight.w500,
                    ),
                  ),
                ),

                DataCell(
                  Column(
                    mainAxisAlignment:
                        MainAxisAlignment.center,
                    children: [
                      Text(
                        '${product.currentStock} ${product.unit}',
                        style: TextStyle(
                          fontWeight: FontWeight.w600,
                          color: product.lowStock
                              ? const Color(0xFFD97706)
                              : AppColors.slate900,
                        ),
                      ),
                      if (product.lowStock)
                        Text(
                          '(mín. ${product.minStock})',
                          style: const TextStyle(
                            fontSize: 12,
                            color: Color(0xFFD97706),
                          ),
                        ),
                    ],
                  ),
                ),

                DataCell(
                  Row(
                    children: [
                      TextButton(
                        onPressed: () => onEdit(product),
                        child: const Text('Editar'),
                      ),
                      TextButton(
                        onPressed: () => onToggle(product),
                        child: Text(
                          product.active
                              ? 'Desativar'
                              : 'Ativar',
                          style: const TextStyle(
                            color: AppColors.slate600,
                          ),
                        ),
                      ),
                      TextButton(
                        onPressed: () => onDelete(product),
                        child: const Text(
                          'Excluir',
                          style: TextStyle(
                            color: AppColors.red600,
                          ),
                        ),
                      ),
                    ],
                  ),
                ),
              ],
            );
          }).toList(),
        ),
      ),
    );
  }
}

class _ProductsCards extends StatelessWidget {
  final List<Product> products;
  final ValueChanged<Product> onEdit;
  final ValueChanged<Product> onToggle;
  final ValueChanged<Product> onDelete;

  const _ProductsCards({
    required this.products,
    required this.onEdit,
    required this.onToggle,
    required this.onDelete,
  });

  String money(double? value) {
    return 'R\$ ${(value ?? 0).toStringAsFixed(2).replaceAll('.', ',')}';
  }

  @override
  Widget build(BuildContext context) {
    return Column(
      children: products.map((product) {
        return Padding(
          padding: const EdgeInsets.only(bottom: 12),
          child: Opacity(
            opacity: product.active ? 1 : .5,
            child: Container(
              padding: const EdgeInsets.all(16),
              decoration: BoxDecoration(
                color: Colors.white,
                borderRadius: BorderRadius.circular(8),
                border: Border.all(
                  color: AppColors.slate200,
                ),
              ),
              child: Column(
                children: [
                  Row(
                    crossAxisAlignment:
                        CrossAxisAlignment.start,
                    children: [
                      _ProductImage(
                        product: product,
                        size: 56,
                      ),

                      const SizedBox(width: 12),

                      Expanded(
                        child: Column(
                          crossAxisAlignment:
                              CrossAxisAlignment.start,
                          children: [
                            Wrap(
                              spacing: 8,
                              runSpacing: 4,
                              children: [
                                Text(
                                  product.name,
                                  style: const TextStyle(
                                    fontWeight:
                                        FontWeight.w500,
                                  ),
                                ),
                                if (!product.active)
                                  const AppBadge(
                                    text: 'Inativo',
                                  ),
                              ],
                            ),

                            const SizedBox(height: 3),

                            Text(
                              '${product.sku ?? 'Sem SKU'} • ${product.unit}',
                              style: const TextStyle(
                                fontSize: 12,
                                color: AppColors.slate500,
                              ),
                            ),
                          ],
                        ),
                      ),

                      if (product.lowStock)
                        const AppBadge(
                          text: 'Estoque baixo',
                          variant:
                              AppBadgeVariant.warning,
                        ),
                    ],
                  ),

                  const SizedBox(height: 16),

                  Row(
                    children: [
                      Expanded(
                        child: _ProductValue(
                          label: 'Custo',
                          value: money(
                            product.costPrice,
                          ),
                        ),
                      ),
                      Expanded(
                        child: _ProductValue(
                          label: 'Venda',
                          value: money(
                            product.salePrice,
                          ),
                        ),
                      ),
                      Expanded(
                        child: _ProductValue(
                          label: 'Estoque',
                          value:
                              '${product.currentStock}',
                          warning:
                              product.lowStock,
                        ),
                      ),
                    ],
                  ),

                  const SizedBox(height: 12),
                  const Divider(),
                  const SizedBox(height: 4),

                  Row(
                    children: [
                      TextButton(
                        onPressed: () =>
                            onEdit(product),
                        child: const Text('Editar'),
                      ),
                      TextButton(
                        onPressed: () =>
                            onToggle(product),
                        child: Text(
                          product.active
                              ? 'Desativar'
                              : 'Ativar',
                        ),
                      ),
                      TextButton(
                        onPressed: () =>
                            onDelete(product),
                        child: const Text(
                          'Excluir',
                          style: TextStyle(
                            color: AppColors.red600,
                          ),
                        ),
                      ),
                    ],
                  ),
                ],
              ),
            ),
          ),
        );
      }).toList(),
    );
  }
}

class _ProductValue extends StatelessWidget {
  final String label;
  final String value;
  final bool warning;

  const _ProductValue({
    required this.label,
    required this.value,
    this.warning = false,
  });

  @override
  Widget build(BuildContext context) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(
          label,
          style: const TextStyle(
            fontSize: 12,
            color: AppColors.slate500,
          ),
        ),
        const SizedBox(height: 3),
        Text(
          value,
          style: TextStyle(
            fontSize: 14,
            fontWeight: FontWeight.w500,
            color: warning
                ? const Color(0xFFD97706)
                : AppColors.slate900,
          ),
        ),
      ],
    );
  }
}

class _ProductImage extends StatelessWidget {
  final Product product;
  final double size;

  const _ProductImage({
    required this.product,
    required this.size,
  });

  @override
  Widget build(BuildContext context) {
    if (product.imageUrl != null) {
      return ClipRRect(
        borderRadius: BorderRadius.circular(8),
        child: Image.network(
          product.imageUrl!,
          width: size,
          height: size,
          fit: BoxFit.cover,
        ),
      );
    }

    return Container(
      width: size,
      height: size,
      alignment: Alignment.center,
      decoration: BoxDecoration(
        color: AppColors.slate100,
        borderRadius: BorderRadius.circular(8),
      ),
      child: const Text(
        '📦',
        style: TextStyle(fontSize: 20),
      ),
    );
  }
}

class _EmptyState extends StatelessWidget {
  final VoidCallback onNewProduct;

  const _EmptyState({
    required this.onNewProduct,
  });

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(48),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(8),
        border: Border.all(
          color: AppColors.slate300,
          style: BorderStyle.solid,
        ),
      ),
      child: Column(
        children: [
          const Text(
            'Nenhum produto cadastrado. Crie o primeiro!',
            style: TextStyle(
              color: AppColors.slate600,
            ),
          ),
          const SizedBox(height: 16),
          AppButton(
            text: '+ Novo produto',
            onPressed: onNewProduct,
          ),
        ],
      ),
    );
  }
}