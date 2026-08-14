import 'package:flutter/material.dart';

import '../../models/financial_transaction.dart';
import '../../theme/app_colors.dart';
import '../../widgets/ui/app_button.dart';
import '../../widgets/ui/app_card.dart';
import '../../widgets/ui/app_input.dart';
import '../../widgets/ui/app_select.dart';
import '../../widgets/ui/app_textarea.dart';

class TransactionFormPage extends StatefulWidget {
  final VoidCallback onBack;
  final ValueChanged<FinancialTransaction> onSave;

  const TransactionFormPage({
    super.key,
    required this.onBack,
    required this.onSave,
  });

  @override
  State<TransactionFormPage> createState() =>
      _TransactionFormPageState();
}

class _TransactionFormPageState
    extends State<TransactionFormPage> {
  static const categories = [
    'Vendas',
    'Serviços',
    'Fornecedores',
    'Salários',
    'Aluguel',
    'Energia',
    'Água',
    'Internet',
    'Impostos',
    'Marketing',
    'Manutenção',
    'Outros',
  ];

  String type = 'EXPENSE';
  String category = 'Outros';
  String status = 'PENDING';

  final descriptionController =
      TextEditingController();

  final amountController =
      TextEditingController();

  final notesController =
      TextEditingController();

  DateTime dueDate = DateTime.now();
  DateTime paidAt = DateTime.now();

  @override
  void dispose() {
    descriptionController.dispose();
    amountController.dispose();
    notesController.dispose();

    super.dispose();
  }

  Future<void> chooseDueDate() async {
    final date = await showDatePicker(
      context: context,
      initialDate: dueDate,
      firstDate: DateTime(2020),
      lastDate: DateTime(2100),
    );

    if (date != null) {
      setState(() {
        dueDate = date;
      });
    }
  }

  Future<void> choosePaidDate() async {
    final date = await showDatePicker(
      context: context,
      initialDate: paidAt,
      firstDate: DateTime(2020),
      lastDate: DateTime(2100),
    );

    if (date != null) {
      setState(() {
        paidAt = date;
      });
    }
  }

  void save() {
    final description =
        descriptionController.text.trim();

    if (description.isEmpty) {
      _error('Descrição obrigatória.');
      return;
    }

    final amount = double.tryParse(
      amountController.text
          .trim()
          .replaceAll(',', '.'),
    );

    if (amount == null || amount <= 0) {
      _error(
        'Valor deve ser maior que zero.',
      );
      return;
    }

    widget.onSave(
      FinancialTransaction(
        id: DateTime.now()
            .millisecondsSinceEpoch
            .toString(),
        type: type,
        category: category,
        description: description,
        amount: amount,
        dueDate: dueDate,
        status: status,
        paidAt:
            status == 'PAID'
                ? paidAt
                : null,
        notes:
            notesController.text
                    .trim()
                    .isEmpty
                ? null
                : notesController.text
                    .trim(),
        createdAt: DateTime.now(),
      ),
    );
  }

  void _error(String text) {
    ScaffoldMessenger.of(context)
        .showSnackBar(
      SnackBar(
        content: Text(text),
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
                  CrossAxisAlignment.stretch,
              children: [
                Align(
                  alignment:
                      Alignment.centerLeft,
                  child: TextButton(
                    onPressed:
                        widget.onBack,
                    child: const Text(
                      '← Voltar',
                      style: TextStyle(
                        color:
                            AppColors.slate500,
                      ),
                    ),
                  ),
                ),

                Text(
                  'Novo lançamento',
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
                  'Registre uma conta a pagar ou a receber',
                  style: TextStyle(
                    fontSize: 14,
                    color:
                        AppColors.slate500,
                  ),
                ),

                const SizedBox(height: 24),

                AppCard(
                  title:
                      'Dados do lançamento',
                  child: Column(
                    crossAxisAlignment:
                        CrossAxisAlignment
                            .stretch,
                    children: [
                      AppSelect<String>(
                        label: 'Tipo',
                        value: type,
                        options: const [
                          AppSelectOption(
                            value: 'INCOME',
                            label:
                                'A receber (receita)',
                          ),
                          AppSelectOption(
                            value: 'EXPENSE',
                            label:
                                'A pagar (despesa)',
                          ),
                        ],
                        onChanged: (value) {
                          if (value == null) {
                            return;
                          }

                          setState(() {
                            type = value;
                          });
                        },
                      ),

                      const SizedBox(
                        height: 16,
                      ),

                      AppInput(
                        label:
                            'Descrição *',
                        placeholder:
                            'Ex: Venda #123, Conta de luz...',
                        controller:
                            descriptionController,
                      ),

                      const SizedBox(
                        height: 16,
                      ),

                      _TwoColumns(
                        left:
                            AppSelect<String>(
                          label:
                              'Categoria *',
                          value:
                              category,
                          options:
                              categories
                                  .map(
                                    (
                                      item,
                                    ) =>
                                        AppSelectOption<
                                            String>(
                                      value:
                                          item,
                                      label:
                                          item,
                                    ),
                                  )
                                  .toList(),
                          onChanged:
                              (value) {
                            if (value ==
                                null) {
                              return;
                            }

                            setState(() {
                              category =
                                  value;
                            });
                          },
                        ),
                        right: AppInput(
                          label:
                              'Valor (R\$) *',
                          controller:
                              amountController,
                          keyboardType:
                              const TextInputType
                                  .numberWithOptions(
                            decimal: true,
                          ),
                        ),
                      ),

                      const SizedBox(
                        height: 16,
                      ),

                      _TwoColumns(
                        left: _DateField(
                          label:
                              'Vencimento *',
                          date: dueDate,
                          onTap:
                              chooseDueDate,
                        ),
                        right:
                            AppSelect<String>(
                          label:
                              'Status',
                          value: status,
                          options: const [
                            AppSelectOption(
                              value:
                                  'PENDING',
                              label:
                                  'Pendente',
                            ),
                            AppSelectOption(
                              value:
                                  'PAID',
                              label:
                                  'Já pago',
                            ),
                            AppSelectOption(
                              value:
                                  'CANCELLED',
                              label:
                                  'Cancelado',
                            ),
                          ],
                          onChanged:
                              (value) {
                            if (value ==
                                null) {
                              return;
                            }

                            setState(() {
                              status =
                                  value;
                            });
                          },
                        ),
                      ),

                      if (status ==
                          'PAID') ...[
                        const SizedBox(
                          height: 16,
                        ),

                        _DateField(
                          label:
                              'Data do pagamento',
                          date: paidAt,
                          onTap:
                              choosePaidDate,
                        ),
                      ],

                      if (status ==
                          'CANCELLED') ...[
                        const SizedBox(
                          height: 16,
                        ),

                        Container(
                          width:
                              double.infinity,
                          padding:
                              const EdgeInsets
                                  .all(12),
                          decoration:
                              BoxDecoration(
                            color:
                                const Color(
                              0xFFFFFBEB,
                            ),
                            borderRadius:
                                BorderRadius
                                    .circular(
                              6,
                            ),
                            border:
                                Border.all(
                              color:
                                  const Color(
                                0xFFFDE68A,
                              ),
                            ),
                          ),
                          child:
                              const Text(
                            'O lançamento será criado como cancelado e não será considerado como pago.',
                            style:
                                TextStyle(
                              fontSize:
                                  14,
                              color:
                                  Color(
                                0xFF92400E,
                              ),
                            ),
                          ),
                        ),
                      ],

                      const SizedBox(
                        height: 16,
                      ),

                      AppTextarea(
                        label:
                            'Observação',
                        rows: 2,
                        placeholder:
                            'Detalhes extras, número da NF, etc.',
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
                              'Criar lançamento',
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

class _TwoColumns
    extends StatelessWidget {
  final Widget left;
  final Widget right;

  const _TwoColumns({
    required this.left,
    required this.right,
  });

  @override
  Widget build(BuildContext context) {
    return LayoutBuilder(
      builder: (
        context,
        constraints,
      ) {
        if (constraints.maxWidth <
            500) {
          return Column(
            crossAxisAlignment:
                CrossAxisAlignment.stretch,
            children: [
              left,
              const SizedBox(
                height: 16,
              ),
              right,
            ],
          );
        }

        return Row(
          crossAxisAlignment:
              CrossAxisAlignment.start,
          children: [
            Expanded(
              child: left,
            ),
            const SizedBox(
              width: 16,
            ),
            Expanded(
              child: right,
            ),
          ],
        );
      },
    );
  }
}

class _DateField
    extends StatelessWidget {
  final String label;
  final DateTime date;
  final VoidCallback onTap;

  const _DateField({
    required this.label,
    required this.date,
    required this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    final formattedDate =
        _formatDate(date);

    return Column(
      crossAxisAlignment:
          CrossAxisAlignment.start,
      children: [
        Text(
          label,
          style: const TextStyle(
            fontSize: 14,
            fontWeight:
                FontWeight.w500,
            color:
                AppColors.slate700,
          ),
        ),

        const SizedBox(height: 6),

        Material(
          color: Colors.white,
          borderRadius:
              BorderRadius.circular(6),
          child: InkWell(
            onTap: onTap,
            borderRadius:
                BorderRadius.circular(
              6,
            ),
            child: Container(
              height: 40,
              padding:
                  const EdgeInsets.symmetric(
                horizontal: 12,
              ),
              decoration:
                  BoxDecoration(
                borderRadius:
                    BorderRadius.circular(
                  6,
                ),
                border: Border.all(
                  color:
                      AppColors.slate300,
                ),
              ),
              child: Row(
                children: [
                  Expanded(
                    child: Text(
                      formattedDate,
                      style:
                          const TextStyle(
                        fontSize: 14,
                        color:
                            AppColors
                                .slate900,
                      ),
                    ),
                  ),

                  const Icon(
                    Icons
                        .calendar_today_outlined,
                    size: 18,
                    color:
                        AppColors
                            .slate500,
                  ),
                ],
              ),
            ),
          ),
        ),
      ],
    );
  }
}

String _formatDate(
  DateTime date,
) {
  String two(int value) {
    return value
        .toString()
        .padLeft(2, '0');
  }

  return '${two(date.day)}/${two(date.month)}/${date.year}';
}