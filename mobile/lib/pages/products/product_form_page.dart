import 'package:flutter/material.dart';

import '../../models/product.dart';
import '../../theme/app_colors.dart';
import '../../widgets/ui/app_button.dart';
import '../../widgets/ui/app_card.dart';
import '../../widgets/ui/app_input.dart';

class ProductFormPage extends StatefulWidget {
  final Product? product;
  final VoidCallback onBack;
  final ValueChanged<Product> onSave;

  const ProductFormPage({
    super.key,
    this.product,
    required this.onBack,
    required this.onSave,
  });

  @override
  State<ProductFormPage> createState() =>
      _ProductFormPageState();
}

class _ProductFormPageState
    extends State<ProductFormPage> {
  late final TextEditingController nameController;
  late final TextEditingController skuController;
  late final TextEditingController descriptionController;
  late final TextEditingController unitController;
  late final TextEditingController stockController;
  late final TextEditingController costController;
  late final TextEditingController saleController;
  late final TextEditingController minimumController;

  bool get editing => widget.product != null;

  @override
  void initState() {
    super.initState();

    final product = widget.product;

    nameController = TextEditingController(
      text: product?.name ?? '',
    );

    skuController = TextEditingController(
      text: product?.sku ?? '',
    );

    descriptionController = TextEditingController(
      text: product?.description ?? '',
    );

    unitController = TextEditingController(
      text: product?.unit ?? 'un',
    );

    stockController = TextEditingController(
      text: '${product?.currentStock ?? 0}',
    );

    costController = TextEditingController(
      text: '${product?.costPrice ?? 0}',
    );

    saleController = TextEditingController(
      text: '${product?.salePrice ?? 0}',
    );

    minimumController = TextEditingController(
      text: '${product?.minStock ?? 0}',
    );
  }

  double number(String value) {
    return double.tryParse(
          value.replaceAll(',', '.'),
        ) ??
        0;
  }

  void save() {
    if (nameController.text.trim().isEmpty) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
          content: Text(
            'Informe o nome do produto',
          ),
        ),
      );
      return;
    }

    final product = Product(
      id: widget.product?.id ??
          DateTime.now()
              .millisecondsSinceEpoch
              .toString(),
      name: nameController.text.trim(),
      sku: skuController.text.trim().isEmpty
          ? null
          : skuController.text.trim(),
      description:
          descriptionController.text.trim().isEmpty
              ? null
              : descriptionController.text.trim(),
      unit: unitController.text.trim(),
      costPrice: number(costController.text),
      salePrice: number(saleController.text),
      currentStock:
          int.tryParse(stockController.text) ?? 0,
      minStock:
          int.tryParse(minimumController.text) ?? 0,
      active: widget.product?.active ?? true,
      imageUrl: widget.product?.imageUrl,
    );

    widget.onSave(product);
  }

  @override
  Widget build(BuildContext context) {
    return ColoredBox(
      color: AppColors.slate50,
      child: SingleChildScrollView(
        padding: const EdgeInsets.all(24),
        child: Center(
          child: ConstrainedBox(
            constraints: const BoxConstraints(
              maxWidth: 672,
            ),
            child: Column(
              crossAxisAlignment:
                  CrossAxisAlignment.stretch,
              children: [
                Align(
                  alignment: Alignment.centerLeft,
                  child: TextButton(
                    onPressed: widget.onBack,
                    child: const Text(
                      '← Voltar para produtos',
                      style: TextStyle(
                        color: AppColors.slate500,
                      ),
                    ),
                  ),
                ),

                const SizedBox(height: 4),

                Text(
                  editing
                      ? 'Editar produto'
                      : 'Novo produto',
                  style: Theme.of(context)
                      .textTheme
                      .headlineMedium
                      ?.copyWith(
                        fontWeight: FontWeight.w700,
                        color: AppColors.slate900,
                      ),
                ),

                const SizedBox(height: 4),

                Text(
                  editing
                      ? widget.product!.name
                      : 'Cadastre um novo produto no estoque',
                  style: const TextStyle(
                    fontSize: 14,
                    color: AppColors.slate500,
                  ),
                ),

                const SizedBox(height: 24),

                AppCard(
                  title: editing
                      ? 'Editar produto'
                      : 'Dados do produto',
                  child: Column(
                    children: [
                      _TwoColumns(
                        left: AppInput(
                          label: 'Nome *',
                          controller: nameController,
                        ),
                        right: AppInput(
                          label: 'SKU',
                          controller: skuController,
                          hint:
                              'Opcional, único na empresa',
                        ),
                      ),

                      const SizedBox(height: 16),

                      _TwoColumns(
                        left: _ImagePlaceholder(),
                        right: _DescriptionField(
                          controller:
                              descriptionController,
                        ),
                      ),

                      const SizedBox(height: 16),

                      _TwoColumns(
                        left: AppInput(
                          label: 'Unidade',
                          controller: unitController,
                          hint: 'Ex: un, kg, m, L',
                        ),
                        right: AppInput(
                          label: editing
                              ? 'Estoque atual'
                              : 'Estoque inicial',
                          controller: stockController,
                          enabled: !editing,
                          hint: editing
                              ? 'Use movimentações para alterar'
                              : null,
                          keyboardType:
                              TextInputType.number,
                        ),
                      ),

                      const SizedBox(height: 16),

                      _ThreeColumns(
                        first: AppInput(
                          label:
                              'Preço de custo (R\$)',
                          controller: costController,
                          keyboardType:
                              const TextInputType
                                  .numberWithOptions(
                            decimal: true,
                          ),
                        ),
                        second: AppInput(
                          label:
                              'Preço de venda (R\$)',
                          controller: saleController,
                          keyboardType:
                              const TextInputType
                                  .numberWithOptions(
                            decimal: true,
                          ),
                        ),
                        third: AppInput(
                          label: 'Estoque mínimo',
                          controller:
                              minimumController,
                          hint:
                              'Alerta quando atingido',
                          keyboardType:
                              TextInputType.number,
                        ),
                      ),

                      const SizedBox(height: 24),

                      Align(
                        alignment: Alignment.centerRight,
                        child: AppButton(
                          text: editing
                              ? 'Salvar alterações'
                              : 'Criar produto',
                          onPressed: save,
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

class _TwoColumns extends StatelessWidget {
  final Widget left;
  final Widget right;

  const _TwoColumns({
    required this.left,
    required this.right,
  });

  @override
  Widget build(BuildContext context) {
    return LayoutBuilder(
      builder: (context, constraints) {
        if (constraints.maxWidth < 500) {
          return Column(
            children: [
              left,
              const SizedBox(height: 16),
              right,
            ],
          );
        }

        return Row(
          crossAxisAlignment:
              CrossAxisAlignment.start,
          children: [
            Expanded(child: left),
            const SizedBox(width: 16),
            Expanded(child: right),
          ],
        );
      },
    );
  }
}

class _ThreeColumns extends StatelessWidget {
  final Widget first;
  final Widget second;
  final Widget third;

  const _ThreeColumns({
    required this.first,
    required this.second,
    required this.third,
  });

  @override
  Widget build(BuildContext context) {
    return LayoutBuilder(
      builder: (context, constraints) {
        if (constraints.maxWidth < 600) {
          return Column(
            children: [
              first,
              const SizedBox(height: 16),
              second,
              const SizedBox(height: 16),
              third,
            ],
          );
        }

        return Row(
          crossAxisAlignment:
              CrossAxisAlignment.start,
          children: [
            Expanded(child: first),
            const SizedBox(width: 16),
            Expanded(child: second),
            const SizedBox(width: 16),
            Expanded(child: third),
          ],
        );
      },
    );
  }
}

class _DescriptionField extends StatelessWidget {
  final TextEditingController controller;

  const _DescriptionField({
    required this.controller,
  });

  @override
  Widget build(BuildContext context) {
    return Column(
      crossAxisAlignment:
          CrossAxisAlignment.start,
      children: [
        const Text(
          'Descrição',
          style: TextStyle(
            fontSize: 14,
            fontWeight: FontWeight.w500,
            color: AppColors.slate700,
          ),
        ),
        const SizedBox(height: 6),
        TextField(
          controller: controller,
          minLines: 3,
          maxLines: 3,
          decoration: InputDecoration(
            border: OutlineInputBorder(
              borderRadius:
                  BorderRadius.circular(6),
            ),
          ),
        ),
      ],
    );
  }
}

class _ImagePlaceholder extends StatelessWidget {
  @override
  Widget build(BuildContext context) {
    return Column(
      crossAxisAlignment:
          CrossAxisAlignment.start,
      children: [
        const Text(
          'Foto do produto',
          style: TextStyle(
            fontSize: 14,
            fontWeight: FontWeight.w500,
            color: AppColors.slate700,
          ),
        ),
        const SizedBox(height: 6),
        Container(
          height: 100,
          alignment: Alignment.center,
          decoration: BoxDecoration(
            color: Colors.white,
            borderRadius: BorderRadius.circular(6),
            border: Border.all(
              color: AppColors.slate300,
            ),
          ),
          child: const Text(
            '📷 Upload depois',
            style: TextStyle(
              color: AppColors.slate500,
            ),
          ),
        ),
        const SizedBox(height: 4),
        const Text(
          'JPEG, PNG, WebP ou GIF (máx. 10MB)',
          style: TextStyle(
            fontSize: 12,
            color: AppColors.slate500,
          ),
        ),
      ],
    );
  }
}