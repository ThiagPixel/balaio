import 'package:flutter/material.dart';

import '../../models/financial_transaction.dart';
import '../../theme/app_colors.dart';
import '../../widgets/ui/app_badge.dart';
import '../../widgets/ui/app_button.dart';
import 'transaction_form_page.dart';

class FinancialPage extends StatefulWidget {
  const FinancialPage({super.key});

  @override
  State<FinancialPage> createState() => _FinancialPageState();
}

class _FinancialPageState extends State<FinancialPage> {
  bool showingForm = false;

  String? typeFilter;
  String? statusFilter;

  final List<FinancialTransaction> transactions = [
    FinancialTransaction(
      id: '1',
      type: 'INCOME',
      category: 'Serviços',
      description: 'Sistema condomínio',
      amount: 1500,
      dueDate: DateTime.now().add(
        const Duration(days: 2),
      ),
      status: 'PENDING',
      notes: 'Pagamento do sistema',
      createdAt: DateTime.now(),
    ),
    FinancialTransaction(
      id: '2',
      type: 'EXPENSE',
      category: 'Internet',
      description: 'Internet',
      amount: 199.90,
      dueDate: DateTime.now().add(
        const Duration(days: 4),
      ),
      status: 'PENDING',
      createdAt: DateTime.now(),
    ),
    FinancialTransaction(
      id: '3',
      type: 'EXPENSE',
      category: 'Fornecedores',
      description: 'Fornecedor de embalagens',
      amount: 780,
      dueDate: DateTime.now().subtract(
        const Duration(days: 4),
      ),
      status: 'PENDING',
      createdAt: DateTime.now(),
    ),
    FinancialTransaction(
      id: '4',
      type: 'INCOME',
      category: 'Vendas',
      description: 'Venda #102',
      amount: 850,
      dueDate: DateTime.now().subtract(
        const Duration(days: 5),
      ),
      paidAt: DateTime.now().subtract(
        const Duration(days: 5),
      ),
      status: 'PAID',
      createdAt: DateTime.now(),
    ),
    FinancialTransaction(
      id: '5',
      type: 'EXPENSE',
      category: 'Marketing',
      description: 'Campanha antiga',
      amount: 300,
      dueDate: DateTime.now().subtract(
        const Duration(days: 10),
      ),
      status: 'CANCELLED',
      createdAt: DateTime.now(),
    ),
  ];

  List<FinancialTransaction> get filtered {
    return transactions.where((transaction) {
      if (typeFilter != null &&
          transaction.type != typeFilter) {
        return false;
      }

      if (statusFilter != null &&
          transaction.status != statusFilter) {
        return false;
      }

      return true;
    }).toList();
  }

  double get totalIncome => filtered
      .where((item) => item.isIncome)
      .fold(0, (sum, item) => sum + item.amount);

  double get totalExpense => filtered
      .where((item) => item.isExpense)
      .fold(0, (sum, item) => sum + item.amount);

  double get pendingIncome => filtered
      .where(
        (item) => item.isIncome && item.isPending,
      )
      .fold(0, (sum, item) => sum + item.amount);

  double get pendingExpense => filtered
      .where(
        (item) => item.isExpense && item.isPending,
      )
      .fold(0, (sum, item) => sum + item.amount);

  void clearFilters() {
    setState(() {
      typeFilter = null;
      statusFilter = null;
    });
  }

  void filterType(String type) {
    setState(() {
      typeFilter = type;
      statusFilter = null;
    });
  }

  void filterStatus(String status) {
    setState(() {
      statusFilter = status;
      typeFilter = null;
    });
  }

  void saveTransaction(
    FinancialTransaction transaction,
  ) {
    setState(() {
      transactions.insert(0, transaction);
      showingForm = false;
    });
  }

  void changeStatus(
    FinancialTransaction transaction,
    String status,
  ) {
    setState(() {
      transaction.status = status;

      if (status == 'PAID') {
        transaction.paidAt = DateTime.now();
      } else {
        transaction.paidAt = null;
      }
    });
  }

  Future<void> cancelTransaction(
    FinancialTransaction transaction,
  ) async {
    final confirmed = await showDialog<bool>(
      context: context,
      builder: (context) {
        return AlertDialog(
          title: const Text(
            'Cancelar lançamento?',
          ),
          content: Text(
            'Cancelar "${transaction.description}"?',
          ),
          actions: [
            TextButton(
              onPressed: () {
                Navigator.pop(context, false);
              },
              child: const Text('Voltar'),
            ),
            FilledButton(
              onPressed: () {
                Navigator.pop(context, true);
              },
              child: const Text(
                'Cancelar lançamento',
              ),
            ),
          ],
        );
      },
    );

    if (confirmed == true) {
      changeStatus(
        transaction,
        'CANCELLED',
      );
    }
  }

  Future<void> deleteTransaction(
    FinancialTransaction transaction,
  ) async {
    final confirmed = await showDialog<bool>(
      context: context,
      builder: (context) {
        return AlertDialog(
          title: const Text(
            'Excluir lançamento?',
          ),
          content: Text(
            'Excluir "${transaction.description}"?',
          ),
          actions: [
            TextButton(
              onPressed: () {
                Navigator.pop(context, false);
              },
              child: const Text('Cancelar'),
            ),
            FilledButton(
              style: FilledButton.styleFrom(
                backgroundColor: AppColors.red600,
              ),
              onPressed: () {
                Navigator.pop(context, true);
              },
              child: const Text('Excluir'),
            ),
          ],
        );
      },
    );

    if (confirmed == true) {
      setState(() {
        transactions.remove(transaction);
      });
    }
  }

  @override
  Widget build(BuildContext context) {
    if (showingForm) {
      return TransactionFormPage(
        onBack: () {
          setState(() {
            showingForm = false;
          });
        },
        onSave: saveTransaction,
      );
    }

    return ColoredBox(
      color: AppColors.slate50,
      child: SingleChildScrollView(
        padding: const EdgeInsets.all(24),
        child: LayoutBuilder(
          builder: (context, constraints) {
            final useTable =
                constraints.maxWidth >= 760;

            return Column(
              crossAxisAlignment:
                  CrossAxisAlignment.stretch,
              children: [
                _Header(
                  onCreate: () {
                    setState(() {
                      showingForm = true;
                    });
                  },
                ),

                const SizedBox(height: 24),

                _Summary(
                  pendingIncome: pendingIncome,
                  pendingExpense: pendingExpense,
                  totalIncome: totalIncome,
                  totalExpense: totalExpense,
                ),

                const SizedBox(height: 24),

                Wrap(
                  spacing: 8,
                  runSpacing: 8,
                  children: [
                    _FilterButton(
                      label: 'Todas',
                      selected:
                          typeFilter == null &&
                          statusFilter == null,
                      onTap: clearFilters,
                    ),
                    _FilterButton(
                      label: 'A receber',
                      selected:
                          typeFilter == 'INCOME',
                      onTap: () {
                        filterType('INCOME');
                      },
                    ),
                    _FilterButton(
                      label: 'A pagar',
                      selected:
                          typeFilter == 'EXPENSE',
                      onTap: () {
                        filterType('EXPENSE');
                      },
                    ),
                    _FilterButton(
                      label: 'Pendentes',
                      selected:
                          statusFilter == 'PENDING',
                      onTap: () {
                        filterStatus('PENDING');
                      },
                    ),
                    _FilterButton(
                      label: 'Pagas',
                      selected:
                          statusFilter == 'PAID',
                      onTap: () {
                        filterStatus('PAID');
                      },
                    ),
                    _FilterButton(
                      label: 'Canceladas',
                      selected:
                          statusFilter == 'CANCELLED',
                      onTap: () {
                        filterStatus('CANCELLED');
                      },
                    ),
                  ],
                ),

                const SizedBox(height: 24),

                if (filtered.isEmpty)
                  _EmptyState(
                    onCreate: () {
                      setState(() {
                        showingForm = true;
                      });
                    },
                  )
                else if (useTable)
                  _FinancialTable(
                    transactions: filtered,
                    onStatusChanged:
                        changeStatus,
                    onCancel:
                        cancelTransaction,
                    onDelete:
                        deleteTransaction,
                  )
                else
                  _FinancialCards(
                    transactions: filtered,
                    onStatusChanged:
                        changeStatus,
                    onCancel:
                        cancelTransaction,
                    onDelete:
                        deleteTransaction,
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
  final VoidCallback onCreate;

  const _Header({
    required this.onCreate,
  });

  @override
  Widget build(BuildContext context) {
    return LayoutBuilder(
      builder: (context, constraints) {
        final compact =
            constraints.maxWidth < 550;

        final title = Column(
          crossAxisAlignment:
              CrossAxisAlignment.start,
          children: [
            Text(
              'Financeiro',
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
              'Contas a pagar e a receber',
              style: TextStyle(
                fontSize: 14,
                color: AppColors.slate500,
              ),
            ),
          ],
        );

        final button = AppButton(
          text: '+ Novo lançamento',
          onPressed: onCreate,
        );

        if (compact) {
          return Column(
            crossAxisAlignment:
                CrossAxisAlignment.stretch,
            children: [
              title,
              const SizedBox(height: 12),
              button,
            ],
          );
        }

        return Row(
          mainAxisAlignment:
              MainAxisAlignment.spaceBetween,
          children: [
            title,
            button,
          ],
        );
      },
    );
  }
}

class _Summary extends StatelessWidget {
  final double pendingIncome;
  final double pendingExpense;
  final double totalIncome;
  final double totalExpense;

  const _Summary({
    required this.pendingIncome,
    required this.pendingExpense,
    required this.totalIncome,
    required this.totalExpense,
  });

  @override
  Widget build(BuildContext context) {
    return LayoutBuilder(
      builder: (context, constraints) {
        int columns;

        if (constraints.maxWidth >= 900) {
          columns = 4;
        } else if (constraints.maxWidth >= 500) {
          columns = 2;
        } else {
          columns = 1;
        }

        const gap = 16.0;

        final width =
            (constraints.maxWidth -
                    gap * (columns - 1)) /
                columns;

        return Wrap(
          spacing: gap,
          runSpacing: gap,
          children: [
            SizedBox(
              width: width,
              child: _SummaryCard(
                title: 'Receitas pendentes',
                value:
                    _currency(pendingIncome),
                color:
                    const Color(0xFF0284C7),
              ),
            ),
            SizedBox(
              width: width,
              child: _SummaryCard(
                title: 'Despesas pendentes',
                value:
                    _currency(pendingExpense),
                color:
                    const Color(0xFFD97706),
              ),
            ),
            SizedBox(
              width: width,
              child: _SummaryCard(
                title: 'Total receitas',
                value:
                    _currency(totalIncome),
                color:
                    const Color(0xFF059669),
              ),
            ),
            SizedBox(
              width: width,
              child: _SummaryCard(
                title: 'Total despesas',
                value:
                    _currency(totalExpense),
                color:
                    AppColors.red600,
              ),
            ),
          ],
        );
      },
    );
  }
}

class _SummaryCard extends StatelessWidget {
  final String title;
  final String value;
  final Color color;

  const _SummaryCard({
    required this.title,
    required this.value,
    required this.color,
  });

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius:
            BorderRadius.circular(8),
        border: Border.all(
          color: AppColors.slate200,
        ),
      ),
      child: Column(
        crossAxisAlignment:
            CrossAxisAlignment.start,
        children: [
          Text(
            title,
            style: const TextStyle(
              fontSize: 12,
              color: AppColors.slate500,
            ),
          ),
          const SizedBox(height: 4),
          Text(
            value,
            style: TextStyle(
              fontSize: 20,
              fontWeight:
                  FontWeight.w600,
              color: color,
            ),
          ),
        ],
      ),
    );
  }
}

class _FilterButton extends StatelessWidget {
  final String label;
  final bool selected;
  final VoidCallback onTap;

  const _FilterButton({
    required this.label,
    required this.selected,
    required this.onTap,
  });

  @override
  Widget build(BuildContext context) {
    return Material(
      color: selected
          ? AppColors.brand600
          : Colors.white,
      shape: StadiumBorder(
        side: BorderSide(
          color: selected
              ? AppColors.brand600
              : AppColors.slate300,
        ),
      ),
      child: InkWell(
        onTap: onTap,
        customBorder:
            const StadiumBorder(),
        child: Padding(
          padding:
              const EdgeInsets.symmetric(
            horizontal: 12,
            vertical: 7,
          ),
          child: Text(
            label,
            style: TextStyle(
              fontSize: 14,
              fontWeight:
                  FontWeight.w500,
              color: selected
                  ? Colors.white
                  : AppColors.slate700,
            ),
          ),
        ),
      ),
    );
  }
}

class _FinancialTable
    extends StatelessWidget {
  final List<FinancialTransaction>
      transactions;

  final void Function(
    FinancialTransaction,
    String,
  ) onStatusChanged;

  final ValueChanged<
      FinancialTransaction> onCancel;

  final ValueChanged<
      FinancialTransaction> onDelete;

  const _FinancialTable({
    required this.transactions,
    required this.onStatusChanged,
    required this.onCancel,
    required this.onDelete,
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
        scrollDirection:
            Axis.horizontal,
        child: DataTable(
          headingRowColor:
              WidgetStateProperty.all(
            AppColors.slate50,
          ),
          columns: const [
            DataColumn(
              label:
                  Text('VENCIMENTO'),
            ),
            DataColumn(
              label:
                  Text('DESCRIÇÃO'),
            ),
            DataColumn(
              label:
                  Text('CATEGORIA'),
            ),
            DataColumn(
              label: Text('VALOR'),
              numeric: true,
            ),
            DataColumn(
              label: Text('STATUS'),
            ),
            DataColumn(
              label: Text('AÇÕES'),
            ),
          ],
          rows: transactions.map(
            (transaction) {
              return DataRow(
                color:
                    WidgetStateProperty.all(
                  transaction.isCancelled
                      ? AppColors.slate50
                      : Colors.white,
                ),
                cells: [
                  DataCell(
                    Text(
                      _date(
                        transaction
                            .dueDate,
                      ),
                      style: TextStyle(
                        fontWeight:
                            transaction
                                    .isOverdue
                                ? FontWeight
                                    .w600
                                : FontWeight
                                    .normal,
                        color:
                            transaction
                                    .isOverdue
                                ? AppColors
                                    .red600
                                : AppColors
                                    .slate700,
                      ),
                    ),
                  ),

                  DataCell(
                    Row(
                      children: [
                        Text(
                          transaction
                                  .isIncome
                              ? '📈'
                              : '📉',
                        ),
                        const SizedBox(
                          width: 8,
                        ),
                        Text(
                          transaction
                              .description,
                          style:
                              const TextStyle(
                            fontWeight:
                                FontWeight
                                    .w500,
                          ),
                        ),
                      ],
                    ),
                  ),

                  DataCell(
                    Text(
                      transaction
                          .category,
                    ),
                  ),

                  DataCell(
                    Text(
                      '${transaction.isIncome ? '+' : '−'}'
                      '${_currency(transaction.amount)}',
                      style: TextStyle(
                        fontWeight:
                            FontWeight
                                .w600,
                        color:
                            transaction
                                    .isIncome
                                ? const Color(
                                    0xFF059669,
                                  )
                                : AppColors
                                    .red600,
                      ),
                    ),
                  ),

                  DataCell(
                    _StatusColumn(
                      transaction:
                          transaction,
                    ),
                  ),

                  DataCell(
                    _Actions(
                      transaction:
                          transaction,
                      onStatusChanged:
                          onStatusChanged,
                      onCancel:
                          onCancel,
                      onDelete:
                          onDelete,
                    ),
                  ),
                ],
              );
            },
          ).toList(),
        ),
      ),
    );
  }
}

class _FinancialCards
    extends StatelessWidget {
  final List<FinancialTransaction>
      transactions;

  final void Function(
    FinancialTransaction,
    String,
  ) onStatusChanged;

  final ValueChanged<
      FinancialTransaction> onCancel;

  final ValueChanged<
      FinancialTransaction> onDelete;

  const _FinancialCards({
    required this.transactions,
    required this.onStatusChanged,
    required this.onCancel,
    required this.onDelete,
  });

  @override
  Widget build(BuildContext context) {
    return Column(
      children:
          transactions.map((transaction) {
        return Padding(
          padding:
              const EdgeInsets.only(
            bottom: 8,
          ),
          child: Opacity(
            opacity:
                transaction.isCancelled
                    ? .5
                    : 1,
            child: Container(
              padding:
                  const EdgeInsets.all(
                16,
              ),
              decoration: BoxDecoration(
                color: Colors.white,
                borderRadius:
                    BorderRadius.circular(
                  8,
                ),
                border: Border.all(
                  color:
                      AppColors.slate200,
                ),
              ),
              child: Column(
                crossAxisAlignment:
                    CrossAxisAlignment
                        .stretch,
                children: [
                  Row(
                    crossAxisAlignment:
                        CrossAxisAlignment
                            .start,
                    children: [
                      Expanded(
                        child: Column(
                          crossAxisAlignment:
                              CrossAxisAlignment
                                  .start,
                          children: [
                            Text(
                              '${transaction.isIncome ? '📈' : '📉'} '
                              '${transaction.description}',
                              style:
                                  const TextStyle(
                                fontSize: 14,
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
                              transaction
                                  .category,
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

                      _StatusBadge(
                        status:
                            transaction
                                .status,
                      ),
                    ],
                  ),

                  const SizedBox(
                    height: 12,
                  ),

                  Row(
                    mainAxisAlignment:
                        MainAxisAlignment
                            .spaceBetween,
                    children: [
                      Flexible(
                        child: Text(
                          '${_date(transaction.dueDate)}'
                          '${transaction.isOverdue ? ' (atrasado)' : ''}',
                          style:
                              TextStyle(
                            fontSize: 14,
                            fontWeight:
                                transaction
                                        .isOverdue
                                    ? FontWeight
                                        .w600
                                    : FontWeight
                                        .normal,
                            color:
                                transaction
                                        .isOverdue
                                    ? AppColors
                                        .red600
                                    : AppColors
                                        .slate600,
                          ),
                        ),
                      ),

                      const SizedBox(
                        width: 12,
                      ),

                      Text(
                        '${transaction.isIncome ? '+' : '−'}'
                        '${_currency(transaction.amount)}',
                        style: TextStyle(
                          fontSize: 16,
                          fontWeight:
                              FontWeight
                                  .w600,
                          color:
                              transaction
                                      .isIncome
                                  ? const Color(
                                      0xFF059669,
                                    )
                                  : AppColors
                                      .red600,
                        ),
                      ),
                    ],
                  ),

                  if (transaction.notes !=
                      null) ...[
                    const SizedBox(
                      height: 8,
                    ),
                    Text(
                      transaction.notes!,
                      style:
                          const TextStyle(
                        fontSize: 12,
                        color:
                            AppColors
                                .slate500,
                      ),
                    ),
                  ],

                  const SizedBox(
                    height: 12,
                  ),
                  const Divider(),
                  const SizedBox(
                    height: 4,
                  ),

                  _Actions(
                    transaction:
                        transaction,
                    onStatusChanged:
                        onStatusChanged,
                    onCancel:
                        onCancel,
                    onDelete:
                        onDelete,
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

class _StatusColumn
    extends StatelessWidget {
  final FinancialTransaction transaction;

  const _StatusColumn({
    required this.transaction,
  });

  @override
  Widget build(BuildContext context) {
    return Column(
      mainAxisAlignment:
          MainAxisAlignment.center,
      children: [
        _StatusBadge(
          status:
              transaction.status,
        ),

        if (transaction.isOverdue) ...[
          const SizedBox(height: 4),
          const Text(
            'Atrasado',
            style: TextStyle(
              fontSize: 12,
              color: AppColors.red600,
            ),
          ),
        ],
      ],
    );
  }
}

class _StatusBadge
    extends StatelessWidget {
  final String status;

  const _StatusBadge({
    required this.status,
  });

  @override
  Widget build(BuildContext context) {
    switch (status) {
      case 'PENDING':
        return const AppBadge(
          text: 'Pendente',
          variant:
              AppBadgeVariant.warning,
        );

      case 'PAID':
        return const AppBadge(
          text: 'Pago',
          variant:
              AppBadgeVariant.success,
        );

      case 'CANCELLED':
      default:
        return const AppBadge(
          text: 'Cancelado',
        );
    }
  }
}

class _Actions extends StatelessWidget {
  final FinancialTransaction transaction;

  final void Function(
    FinancialTransaction,
    String,
  ) onStatusChanged;

  final ValueChanged<
      FinancialTransaction> onCancel;

  final ValueChanged<
      FinancialTransaction> onDelete;

  const _Actions({
    required this.transaction,
    required this.onStatusChanged,
    required this.onCancel,
    required this.onDelete,
  });

  @override
  Widget build(BuildContext context) {
    return Wrap(
      spacing: 4,
      runSpacing: 4,
      children: [
        if (transaction.isPending)
          TextButton(
            onPressed: () {
              onStatusChanged(
                transaction,
                'PAID',
              );
            },
            child: const Text(
              'Marcar como pago',
              style: TextStyle(
                color:
                    Color(0xFF059669),
              ),
            ),
          ),

        if (transaction.isPaid)
          TextButton(
            onPressed: () {
              onStatusChanged(
                transaction,
                'PENDING',
              );
            },
            child:
                const Text('Reabrir'),
          ),

        if (!transaction.isCancelled)
          TextButton(
            onPressed: () {
              onCancel(transaction);
            },
            child: const Text(
              'Cancelar',
              style: TextStyle(
                color:
                    Color(0xFFD97706),
              ),
            ),
          ),

        TextButton(
          onPressed: () {
            onDelete(transaction);
          },
          child: const Text(
            'Excluir',
            style: TextStyle(
              color:
                  AppColors.red600,
            ),
          ),
        ),
      ],
    );
  }
}

class _EmptyState
    extends StatelessWidget {
  final VoidCallback onCreate;

  const _EmptyState({
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
            'Nenhum lançamento encontrado.',
            style: TextStyle(
              color:
                  AppColors.slate600,
            ),
          ),

          const SizedBox(height: 16),

          AppButton(
            text:
                '+ Criar primeiro lançamento',
            onPressed: onCreate,
          ),
        ],
      ),
    );
  }
}

String _currency(double value) {
  return 'R\$ ${value.toStringAsFixed(2).replaceAll('.', ',')}';
}

String _date(DateTime date) {
  String two(int value) {
    return value.toString().padLeft(2, '0');
  }

  return '${two(date.day)}/${two(date.month)}/${date.year}';
}