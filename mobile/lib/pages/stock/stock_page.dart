import 'package:flutter/material.dart';

import '../../models/product.dart';
import '../../models/stock_movement.dart';
import '../../theme/app_colors.dart';
import '../../widgets/ui/app_badge.dart';
import '../../widgets/ui/app_button.dart';
import 'stock_movement_form_page.dart';

class StockPage extends StatefulWidget {
  const StockPage({super.key});

  @override
  State<StockPage> createState() => _StockPageState();
}

class _StockPageState extends State<StockPage> {
  bool showingForm = false;

  // Depois isso vem de list_stock_products()
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
      unit: 'pct',
      costPrice: 6.80,
      salePrice: 10,
      currentStock: 12,
      minStock: 50,
    ),
  ];

  final List<StockMovement> movements = [
    StockMovement(
      id: '1',
      type: 'IN',
      quantity: 20,
      unitCost: 22.50,
      notes: 'Compra mensal',
      createdAt: DateTime.now().subtract(
        const Duration(hours: 2),
      ),
      productName: 'Papel A4',
      productUnit: 'pct',
      responsibleName: 'Administrador',
    ),
    StockMovement(
      id: '2',
      type: 'OUT',
      quantity: 5,
      createdAt: DateTime.now().subtract(
        const Duration(days: 1),
      ),
      productName: 'Caneta azul',
      productUnit: 'un',
      responsibleName: 'Administrador',
      notes: 'Material entregue',
    ),
    StockMovement(
      id: '3',
      type: 'ADJUST',
      quantity: 12,
      createdAt: DateTime.now().subtract(
        const Duration(days: 2),
      ),
      productName: 'Copo descartável',
      productUnit: 'pct',
      responsibleName: 'Administrador',
      notes: 'Contagem de inventário',
    ),
  ];

  void openForm() {
    setState(() {
      showingForm = true;
    });
  }

  void closeForm() {
    setState(() {
      showingForm = false;
    });
  }

  void registerMovement({
    required Product product,
    required String type,
    required int quantity,
    double? unitCost,
    String? notes,
  }) {
    setState(() {
      switch (type) {
        case 'IN':
          product.currentStock += quantity;

        case 'OUT':
          product.currentStock -= quantity;

        case 'ADJUST':
          product.currentStock = quantity;
      }

      movements.insert(
        0,
        StockMovement(
          id: DateTime.now()
              .millisecondsSinceEpoch
              .toString(),
          type: type,
          quantity: quantity,
          unitCost: type == 'IN'
              ? unitCost
              : null,
          notes: notes,
          createdAt: DateTime.now(),
          productName: product.name,
          productUnit: product.unit,
          responsibleName: 'Administrador',
        ),
      );

      showingForm = false;
    });
  }

  @override
  Widget build(BuildContext context) {
    if (showingForm) {
      return StockMovementFormPage(
        products: products,
        onBack: closeForm,
        onSave: registerMovement,
      );
    }

    return ColoredBox(
      color: AppColors.slate50,
      child: SingleChildScrollView(
        padding: const EdgeInsets.all(24),
        child: LayoutBuilder(
          builder: (context, constraints) {
            final tableLayout =
                constraints.maxWidth >= 760;

            return Column(
              crossAxisAlignment:
                  CrossAxisAlignment.stretch,
              children: [
                _StockHeader(
                  onNewMovement: openForm,
                ),

                const SizedBox(height: 24),

                if (movements.isEmpty)
                  _EmptyStock(
                    onCreate: openForm,
                  )
                else if (tableLayout)
                  _MovementTable(
                    movements: movements,
                  )
                else
                  _MovementCards(
                    movements: movements,
                  ),
              ],
            );
          },
        ),
      ),
    );
  }
}

class _StockHeader extends StatelessWidget {
  final VoidCallback onNewMovement;

  const _StockHeader({
    required this.onNewMovement,
  });

  @override
  Widget build(BuildContext context) {
    return LayoutBuilder(
      builder: (context, constraints) {
        final compact =
            constraints.maxWidth < 550;

        final heading = Column(
          crossAxisAlignment:
              CrossAxisAlignment.start,
          children: [
            Text(
              'Movimentações',
              style: Theme.of(context)
                  .textTheme
                  .headlineMedium
                  ?.copyWith(
                    fontWeight:
                        FontWeight.w700,
                    color:
                        AppColors.slate900,
                  ),
            ),

            const SizedBox(height: 4),

            const Text(
              'Entradas, saídas e ajustes de estoque',
              style: TextStyle(
                fontSize: 14,
                color: AppColors.slate500,
              ),
            ),
          ],
        );

        final button = AppButton(
          text: '+ Nova movimentação',
          onPressed: onNewMovement,
        );

        if (compact) {
          return Column(
            crossAxisAlignment:
                CrossAxisAlignment.stretch,
            children: [
              heading,
              const SizedBox(height: 12),
              button,
            ],
          );
        }

        return Row(
          mainAxisAlignment:
              MainAxisAlignment.spaceBetween,
          children: [
            heading,
            button,
          ],
        );
      },
    );
  }
}

class _MovementTable extends StatelessWidget {
  final List<StockMovement> movements;

  const _MovementTable({
    required this.movements,
  });

  @override
  Widget build(BuildContext context) {
    return Container(
      clipBehavior: Clip.antiAlias,
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius:
            BorderRadius.circular(8),
        border: Border.all(
          color: AppColors.slate200,
        ),
      ),
      child: SingleChildScrollView(
        scrollDirection: Axis.horizontal,
        child: DataTable(
          headingRowColor:
              WidgetStateProperty.all(
            AppColors.slate50,
          ),
          columns: const [
            DataColumn(
              label: Text('DATA'),
            ),
            DataColumn(
              label: Text('PRODUTO'),
            ),
            DataColumn(
              label: Text('TIPO'),
            ),
            DataColumn(
              numeric: true,
              label: Text('QUANTIDADE'),
            ),
            DataColumn(
              numeric: true,
              label: Text('CUSTO UNIT.'),
            ),
            DataColumn(
              label: Text('RESPONSÁVEL'),
            ),
            DataColumn(
              label: Text('OBSERVAÇÃO'),
            ),
          ],
          rows: movements
              .map(
                (movement) =>
                    DataRow(
                  cells: [
                    DataCell(
                      Text(
                        _formatDateTime(
                          movement.createdAt,
                        ),
                      ),
                    ),

                    DataCell(
                      Text(
                        movement.productName,
                        style:
                            const TextStyle(
                          fontWeight:
                              FontWeight.w500,
                        ),
                      ),
                    ),

                    DataCell(
                      _MovementBadge(
                        type:
                            movement.type,
                      ),
                    ),

                    DataCell(
                      Text(
                        _quantity(
                          movement,
                        ),
                        style:
                            const TextStyle(
                          fontWeight:
                              FontWeight.w600,
                        ),
                      ),
                    ),

                    DataCell(
                      Text(
                        movement.unitCost !=
                                null
                            ? _currency(
                                movement
                                    .unitCost!,
                              )
                            : '—',
                      ),
                    ),

                    DataCell(
                      Text(
                        movement
                            .responsible,
                      ),
                    ),

                    DataCell(
                      Text(
                        movement.notes ??
                            '—',
                      ),
                    ),
                  ],
                ),
              )
              .toList(),
        ),
      ),
    );
  }
}

class _MovementCards extends StatelessWidget {
  final List<StockMovement> movements;

  const _MovementCards({
    required this.movements,
  });

  @override
  Widget build(BuildContext context) {
    return Column(
      children: movements.map((movement) {
        return Padding(
          padding:
              const EdgeInsets.only(bottom: 8),
          child: Container(
            padding:
                const EdgeInsets.all(16),
            decoration: BoxDecoration(
              color: Colors.white,
              borderRadius:
                  BorderRadius.circular(8),
              border: Border.all(
                color:
                    AppColors.slate200,
              ),
              boxShadow: const [
                BoxShadow(
                  color:
                      Color(0x0D000000),
                  offset: Offset(0, 1),
                  blurRadius: 2,
                ),
              ],
            ),
            child: Column(
              children: [
                Row(
                  crossAxisAlignment:
                      CrossAxisAlignment.start,
                  children: [
                    Expanded(
                      child: Column(
                        crossAxisAlignment:
                            CrossAxisAlignment
                                .start,
                        children: [
                          Text(
                            movement
                                .productName,
                            style:
                                const TextStyle(
                              fontWeight:
                                  FontWeight
                                      .w500,
                              color:
                                  AppColors
                                      .slate900,
                            ),
                          ),
                          const SizedBox(
                            height: 3,
                          ),
                          Text(
                            _formatDateTime(
                              movement
                                  .createdAt,
                            ),
                            style:
                                const TextStyle(
                              fontSize: 12,
                              color:
                                  AppColors
                                      .slate500,
                            ),
                          ),
                        ],
                      ),
                    ),

                    _MovementBadge(
                      type: movement.type,
                    ),
                  ],
                ),

                const SizedBox(height: 12),

                Row(
                  mainAxisAlignment:
                      MainAxisAlignment
                          .spaceBetween,
                  children: [
                    Text(
                      _quantity(movement),
                      style:
                          const TextStyle(
                        fontSize: 14,
                        fontWeight:
                            FontWeight.w600,
                        color:
                            AppColors.slate900,
                      ),
                    ),

                    if (movement.unitCost !=
                        null)
                      Text(
                        '${_currency(movement.unitCost!)}/un',
                        style:
                            const TextStyle(
                          fontSize: 14,
                          color:
                              AppColors
                                  .slate500,
                        ),
                      ),
                  ],
                ),

                const SizedBox(height: 8),

                Align(
                  alignment:
                      Alignment.centerLeft,
                  child: Text(
                    'Por: ${movement.responsible}',
                    style:
                        const TextStyle(
                      fontSize: 12,
                      color:
                          AppColors.slate500,
                    ),
                  ),
                ),

                if (movement.notes != null &&
                    movement.notes!
                        .isNotEmpty) ...[
                  const SizedBox(height: 4),

                  Align(
                    alignment:
                        Alignment.centerLeft,
                    child: Text(
                      movement.notes!,
                      style:
                          const TextStyle(
                        fontSize: 12,
                        color:
                            AppColors
                                .slate500,
                      ),
                    ),
                  ),
                ],
              ],
            ),
          ),
        );
      }).toList(),
    );
  }
}

class _MovementBadge extends StatelessWidget {
  final String type;

  const _MovementBadge({
    required this.type,
  });

  @override
  Widget build(BuildContext context) {
    switch (type) {
      case 'IN':
        return const AppBadge(
          text: 'Entrada',
          variant:
              AppBadgeVariant.success,
        );

      case 'OUT':
        return const AppBadge(
          text: 'Saída',
          variant:
              AppBadgeVariant.danger,
        );

      default:
        return const AppBadge(
          text: 'Ajuste',
          variant:
              AppBadgeVariant.info,
        );
    }
  }
}

class _EmptyStock extends StatelessWidget {
  final VoidCallback onCreate;

  const _EmptyStock({
    required this.onCreate,
  });

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(48),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius:
            BorderRadius.circular(8),
        border: Border.all(
          color: AppColors.slate300,
        ),
      ),
      child: Column(
        children: [
          const Text(
            'Nenhuma movimentação registrada ainda.',
            style: TextStyle(
              color: AppColors.slate600,
            ),
          ),

          const SizedBox(height: 16),

          AppButton(
            text:
                '+ Criar primeira movimentação',
            onPressed: onCreate,
          ),
        ],
      ),
    );
  }
}

String _quantity(
  StockMovement movement,
) {
  final prefix = switch (movement.type) {
    'IN' => '+',
    'OUT' => '−',
    _ => '',
  };

  return '$prefix${movement.quantity} ${movement.productUnit}';
}

String _currency(double value) {
  return 'R\$ ${value.toStringAsFixed(2).replaceAll('.', ',')}';
}

String _two(int value) {
  return value.toString().padLeft(2, '0');
}

String _formatDateTime(DateTime date) {
  return '${_two(date.day)}/${_two(date.month)}/${date.year} '
      '${_two(date.hour)}:${_two(date.minute)}';
}