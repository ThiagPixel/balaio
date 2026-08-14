import 'package:flutter/material.dart';

import '../../models/product.dart';
import '../../theme/app_colors.dart';
import '../../widgets/ui/app_button.dart';
import '../../widgets/ui/app_card.dart';
import '../../widgets/ui/app_input.dart';
import '../../widgets/ui/app_select.dart';
import '../../widgets/ui/app_textarea.dart';

typedef SaveMovement = void Function({
  required Product product,
  required String type,
  required int quantity,
  double? unitCost,
  String? notes,
});

class StockMovementFormPage
    extends StatefulWidget {
  final List<Product> products;
  final VoidCallback onBack;
  final SaveMovement onSave;

  const StockMovementFormPage({
    super.key,
    required this.products,
    required this.onBack,
    required this.onSave,
  });

  @override
  State<StockMovementFormPage>
      createState() =>
          _StockMovementFormPageState();
}

class _StockMovementFormPageState
    extends State<StockMovementFormPage> {
  late Product selectedProduct;

  String selectedType = 'IN';

  final quantityController =
      TextEditingController();

  final unitCostController =
      TextEditingController();

  final notesController =
      TextEditingController();

  bool get isAdjustment =>
      selectedType == 'ADJUST';

  bool get showUnitCost =>
      selectedType == 'IN';

  @override
  void initState() {
    super.initState();

    selectedProduct =
        widget.products.first;
  }

  @override
  void dispose() {
    quantityController.dispose();
    unitCostController.dispose();
    notesController.dispose();
    super.dispose();
  }

  void submit() {
    final quantity = int.tryParse(
      quantityController.text.trim(),
    );

    if (quantity == null) {
      _error(
        'Informe uma quantidade válida.',
      );
      return;
    }

    if (isAdjustment) {
      if (quantity < 0) {
        _error(
          'O novo estoque não pode ser negativo.',
        );
        return;
      }
    } else {
      if (quantity <= 0) {
        _error(
          'A quantidade deve ser maior que zero.',
        );
        return;
      }
    }

    if (selectedType == 'OUT' &&
        quantity >
            selectedProduct.currentStock) {
      _error(
        'A quantidade de saída é maior que o estoque atual.',
      );
      return;
    }

    final unitCost =
        unitCostController.text.trim().isEmpty
            ? null
            : double.tryParse(
                unitCostController.text
                    .replaceAll(',', '.'),
              );

    if (unitCost != null &&
        unitCost < 0) {
      _error(
        'O custo não pode ser negativo.',
      );
      return;
    }

    widget.onSave(
      product: selectedProduct,
      type: selectedType,
      quantity: quantity,
      unitCost: unitCost,
      notes:
          notesController.text.trim().isEmpty
              ? null
              : notesController.text.trim(),
    );
  }

  void _error(String message) {
    ScaffoldMessenger.of(context)
        .showSnackBar(
      SnackBar(
        content: Text(message),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    return ColoredBox(
      color: AppColors.slate50,
      child: SingleChildScrollView(
        padding: const EdgeInsets.all(24),
        child: Center(
          child: ConstrainedBox(
            constraints:
                const BoxConstraints(
              maxWidth: 672,
            ),
            child: Column(
              crossAxisAlignment:
                  CrossAxisAlignment
                      .stretch,
              children: [
                Align(
                  alignment:
                      Alignment.centerLeft,
                  child: TextButton(
                    onPressed: widget.onBack,
                    child: const Text(
                      '← Voltar para movimentações',
                      style: TextStyle(
                        color:
                            AppColors.slate500,
                      ),
                    ),
                  ),
                ),

                const SizedBox(height: 4),

                Text(
                  'Nova movimentação',
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
                  'Registre uma entrada, saída ou ajuste de estoque',
                  style: TextStyle(
                    fontSize: 14,
                    color:
                        AppColors.slate500,
                  ),
                ),

                const SizedBox(height: 24),

                AppCard(
                  title:
                      'Dados da movimentação',
                  child: Column(
                    crossAxisAlignment:
                        CrossAxisAlignment
                            .stretch,
                    children: [
                      AppSelect<String>(
                        label: 'Produto',
                        value:
                            selectedProduct.id,
                        options: widget.products
                            .map(
                              (product) =>
                                  AppSelectOption<
                                      String>(
                                value:
                                    product.id,
                                label:
                                    '${product.name} '
                                    '(atual: '
                                    '${product.currentStock} '
                                    '${product.unit})',
                              ),
                            )
                            .toList(),
                        onChanged: (id) {
                          if (id == null) {
                            return;
                          }

                          setState(() {
                            selectedProduct =
                                widget.products
                                    .firstWhere(
                              (product) =>
                                  product.id ==
                                  id,
                            );
                          });
                        },
                      ),

                      const SizedBox(
                        height: 16,
                      ),

                      AppSelect<String>(
                        label: 'Tipo',
                        value: selectedType,
                        options: const [
                          AppSelectOption(
                            value: 'IN',
                            label:
                                'Entrada (compra/devolução)',
                          ),
                          AppSelectOption(
                            value: 'OUT',
                            label:
                                'Saída (venda/consumo)',
                          ),
                          AppSelectOption(
                            value: 'ADJUST',
                            label:
                                'Ajuste (inventário)',
                          ),
                        ],
                        onChanged: (type) {
                          if (type == null) {
                            return;
                          }

                          setState(() {
                            selectedType =
                                type;
                          });
                        },
                      ),

                      const SizedBox(
                        height: 16,
                      ),

                      LayoutBuilder(
                        builder:
                            (context,
                                constraints) {
                          if (!showUnitCost ||
                              constraints
                                      .maxWidth <
                                  500) {
                            return Column(
                              children: [
                                AppInput(
                                  label:
                                      isAdjustment
                                          ? 'Novo estoque'
                                          : 'Quantidade',
                                  controller:
                                      quantityController,
                                  keyboardType:
                                      TextInputType
                                          .number,
                                  hint:
                                      isAdjustment
                                          ? 'Informe a quantidade total que deverá permanecer no estoque'
                                          : null,
                                ),

                                if (showUnitCost) ...[
                                  const SizedBox(
                                    height: 16,
                                  ),

                                  AppInput(
                                    label:
                                        'Custo unitário (R\$)',
                                    controller:
                                        unitCostController,
                                    keyboardType:
                                        const TextInputType
                                            .numberWithOptions(
                                      decimal:
                                          true,
                                    ),
                                    hint:
                                        'Opcional, usado em entradas',
                                  ),
                                ],
                              ],
                            );
                          }

                          return Row(
                            crossAxisAlignment:
                                CrossAxisAlignment
                                    .start,
                            children: [
                              Expanded(
                                child:
                                    AppInput(
                                  label:
                                      'Quantidade',
                                  controller:
                                      quantityController,
                                  keyboardType:
                                      TextInputType
                                          .number,
                                ),
                              ),

                              const SizedBox(
                                width: 16,
                              ),

                              Expanded(
                                child:
                                    AppInput(
                                  label:
                                      'Custo unitário (R\$)',
                                  controller:
                                      unitCostController,
                                  keyboardType:
                                      const TextInputType
                                          .numberWithOptions(
                                    decimal:
                                        true,
                                  ),
                                  hint:
                                      'Opcional, usado em entradas',
                                ),
                              ),
                            ],
                          );
                        },
                      ),

                      const SizedBox(
                        height: 16,
                      ),

                      Container(
                        padding:
                            const EdgeInsets
                                .all(12),
                        decoration:
                            BoxDecoration(
                          color: AppColors
                              .slate50,
                          borderRadius:
                              BorderRadius
                                  .circular(
                            6,
                          ),
                        ),
                        child: Text(
                          'Estoque atual: '
                          '${selectedProduct.currentStock} '
                          '${selectedProduct.unit}',
                          style:
                              const TextStyle(
                            fontSize: 14,
                            color: AppColors
                                .slate600,
                          ),
                        ),
                      ),

                      const SizedBox(
                        height: 16,
                      ),

                      AppTextarea(
                        label: 'Observação',
                        rows: 2,
                        placeholder:
                            'Motivo, fornecedor, etc.',
                        controller:
                            notesController,
                      ),

                      const SizedBox(
                        height: 24,
                      ),

                      Align(
                        alignment:
                            Alignment
                                .centerRight,
                        child: AppButton(
                          text:
                              'Registrar movimentação',
                          onPressed: submit,
                        ),
                      ),
                    ],
                  ),
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }
}