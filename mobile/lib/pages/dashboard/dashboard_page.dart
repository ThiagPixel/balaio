import 'package:flutter/material.dart';

import '../../theme/app_colors.dart';

class DashboardPage extends StatelessWidget {
  final VoidCallback onOpenProducts;
  final VoidCallback onOpenFinancial;

  const DashboardPage({
    super.key,
    required this.onOpenProducts,
    required this.onOpenFinancial,
  });

  @override
  Widget build(BuildContext context) {
    return ColoredBox(
      color: AppColors.slate50,
      child: SingleChildScrollView(
        padding: const EdgeInsets.all(24),
        child: LayoutBuilder(
          builder: (context, constraints) {
            final columns = constraints.maxWidth >= 1050
                ? 4
                : constraints.maxWidth >= 550
                    ? 2
                    : 1;

            const gap = 16.0;

            final metricWidth =
                (constraints.maxWidth -
                        (gap * (columns - 1))) /
                    columns;

            return Column(
              crossAxisAlignment:
                  CrossAxisAlignment.start,
              children: [
                Text(
                  'Dashboard',
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
                  'Visão geral do seu negócio',
                  style: TextStyle(
                    fontSize: 14,
                    color: AppColors.slate500,
                  ),
                ),

                const SizedBox(height: 24),

                Wrap(
                  spacing: gap,
                  runSpacing: gap,
                  children: [
                    SizedBox(
                      width: metricWidth,
                      child: const _MetricCard(
                        label: 'Saldo do período',
                        value: 'R\$ 12.450,00',
                        description:
                            'Receitas recebidas menos despesas pagas',
                        valueColor:
                            Color(0xFF059669),
                      ),
                    ),
                    SizedBox(
                      width: metricWidth,
                      child: const _MetricCard(
                        label: 'A receber',
                        value: 'R\$ 4.300,00',
                        description:
                            'Receitas pendentes',
                        valueColor:
                            Color(0xFF0284C7),
                      ),
                    ),
                    SizedBox(
                      width: metricWidth,
                      child: const _MetricCard(
                        label: 'A pagar',
                        value: 'R\$ 2.180,00',
                        description:
                            'Despesas pendentes',
                        valueColor:
                            Color(0xFFD97706),
                      ),
                    ),
                    SizedBox(
                      width: metricWidth,
                      child: const _MetricCard(
                        label: 'Produtos ativos',
                        value: '37',
                        description:
                            'Produtos ativos no cadastro',
                      ),
                    ),
                  ],
                ),

                const SizedBox(height: 24),

                if (constraints.maxWidth >= 750)
                  Row(
                    crossAxisAlignment:
                        CrossAxisAlignment.start,
                    children: [
                      Expanded(
                        child: _OverdueCard(
                          onOpen:
                              onOpenFinancial,
                        ),
                      ),
                      const SizedBox(width: 24),
                      Expanded(
                        child: _UpcomingCard(
                          onOpen:
                              onOpenFinancial,
                        ),
                      ),
                    ],
                  )
                else
                  Column(
                    children: [
                      _OverdueCard(
                        onOpen: onOpenFinancial,
                      ),
                      const SizedBox(height: 24),
                      _UpcomingCard(
                        onOpen: onOpenFinancial,
                      ),
                    ],
                  ),

                const SizedBox(height: 24),

                _LowStockCard(
                  onOpen: onOpenProducts,
                ),
              ],
            );
          },
        ),
      ),
    );
  }
}

class _MetricCard extends StatelessWidget {
  final String label;
  final String value;
  final String description;
  final Color? valueColor;

  const _MetricCard({
    required this.label,
    required this.value,
    required this.description,
    this.valueColor,
  });

  @override
  Widget build(BuildContext context) {
    return _DashboardCard(
      child: Padding(
        padding: const EdgeInsets.all(24),
        child: Column(
          crossAxisAlignment:
              CrossAxisAlignment.start,
          children: [
            Text(
              label,
              style: const TextStyle(
                fontSize: 14,
                color: AppColors.slate500,
              ),
            ),

            const SizedBox(height: 8),

            Text(
              value,
              style: TextStyle(
                fontSize: 22,
                fontWeight: FontWeight.w600,
                color: valueColor ??
                    AppColors.slate900,
              ),
            ),

            const SizedBox(height: 12),

            Text(
              description,
              style: const TextStyle(
                fontSize: 12,
                color: AppColors.slate500,
              ),
            ),
          ],
        ),
      ),
    );
  }
}

class _OverdueCard extends StatelessWidget {
  final VoidCallback onOpen;

  const _OverdueCard({
    required this.onOpen,
  });

  @override
  Widget build(BuildContext context) {
    return _DashboardCard(
      child: Padding(
        padding: const EdgeInsets.all(24),
        child: Column(
          crossAxisAlignment:
              CrossAxisAlignment.start,
          children: [
            const Row(
              children: [
                Text(
                  '⚠️ Em atraso',
                  style: TextStyle(
                    fontSize: 18,
                    fontWeight: FontWeight.w600,
                    color: AppColors.slate900,
                  ),
                ),
                SizedBox(width: 8),
                _Badge(
                  text: '2',
                  background:
                      Color(0xFFFEE2E2),
                  foreground:
                      Color(0xFFB91C1C),
                ),
              ],
            ),

            const SizedBox(height: 6),

            const Text(
              'Contas pendentes com vencimento passado',
              style: TextStyle(
                fontSize: 14,
                color: AppColors.slate500,
              ),
            ),

            const SizedBox(height: 20),

            const _FinancialRow(
              title: 'Fornecedor de embalagens',
              subtitle: 'Venceu em 10/08/2026',
              amount: 'R\$ 780,00',
              danger: true,
            ),

            const Divider(),

            const _FinancialRow(
              title: 'Conta de energia',
              subtitle: 'Venceu em 12/08/2026',
              amount: 'R\$ 420,00',
              danger: true,
            ),

            const SizedBox(height: 12),

            TextButton(
              onPressed: onOpen,
              child: const Text(
                'Ver financeiro →',
              ),
            ),
          ],
        ),
      ),
    );
  }
}

class _UpcomingCard extends StatelessWidget {
  final VoidCallback onOpen;

  const _UpcomingCard({
    required this.onOpen,
  });

  @override
  Widget build(BuildContext context) {
    return _DashboardCard(
      child: Padding(
        padding: const EdgeInsets.all(24),
        child: Column(
          crossAxisAlignment:
              CrossAxisAlignment.start,
          children: [
            const Text(
              '📅 Próximos 7 dias',
              style: TextStyle(
                fontSize: 18,
                fontWeight: FontWeight.w600,
                color: AppColors.slate900,
              ),
            ),

            const SizedBox(height: 6),

            const Text(
              'Vencimentos que estão chegando',
              style: TextStyle(
                fontSize: 14,
                color: AppColors.slate500,
              ),
            ),

            const SizedBox(height: 20),

            const _FinancialRow(
              title: 'Cliente Empresa X',
              subtitle: 'A receber • 16/08/2026',
              amount: 'R\$ 1.500,00',
              success: true,
            ),

            const Divider(),

            const _FinancialRow(
              title: 'Internet',
              subtitle: 'A pagar • 18/08/2026',
              amount: 'R\$ 199,90',
              danger: true,
            ),

            const SizedBox(height: 12),

            TextButton(
              onPressed: onOpen,
              child: const Text(
                'Ver financeiro →',
              ),
            ),
          ],
        ),
      ),
    );
  }
}

class _LowStockCard extends StatelessWidget {
  final VoidCallback onOpen;

  const _LowStockCard({
    required this.onOpen,
  });

  @override
  Widget build(BuildContext context) {
    return _DashboardCard(
      child: Padding(
        padding: const EdgeInsets.all(24),
        child: Column(
          crossAxisAlignment:
              CrossAxisAlignment.start,
          children: [
            const Row(
              children: [
                Text(
                  '📦 Estoque baixo',
                  style: TextStyle(
                    fontSize: 18,
                    fontWeight: FontWeight.w600,
                    color: AppColors.slate900,
                  ),
                ),

                SizedBox(width: 8),

                _Badge(
                  text: '3',
                  background:
                      Color(0xFFFEF3C7),
                  foreground:
                      Color(0xFFB45309),
                ),
              ],
            ),

            const SizedBox(height: 6),

            const Text(
              'Produtos abaixo do estoque mínimo',
              style: TextStyle(
                fontSize: 14,
                color: AppColors.slate500,
              ),
            ),

            const SizedBox(height: 20),

            const _StockRow(
              name: 'Papel A4',
              minimum: 10,
              stock: 4,
            ),

            const Divider(),

            const _StockRow(
              name: 'Caneta azul',
              minimum: 20,
              stock: 8,
            ),

            const Divider(),

            const _StockRow(
              name: 'Copo descartável',
              minimum: 50,
              stock: 12,
            ),

            const SizedBox(height: 12),

            TextButton(
              onPressed: onOpen,
              child: const Text(
                'Ver produtos →',
              ),
            ),
          ],
        ),
      ),
    );
  }
}

class _FinancialRow extends StatelessWidget {
  final String title;
  final String subtitle;
  final String amount;
  final bool danger;
  final bool success;

  const _FinancialRow({
    required this.title,
    required this.subtitle,
    required this.amount,
    this.danger = false,
    this.success = false,
  });

  @override
  Widget build(BuildContext context) {
    final color = danger
        ? const Color(0xFFDC2626)
        : success
            ? const Color(0xFF059669)
            : AppColors.slate900;

    return Padding(
      padding:
          const EdgeInsets.symmetric(vertical: 8),
      child: Row(
        children: [
          Expanded(
            child: Column(
              crossAxisAlignment:
                  CrossAxisAlignment.start,
              children: [
                Text(
                  title,
                  maxLines: 1,
                  overflow:
                      TextOverflow.ellipsis,
                  style: const TextStyle(
                    fontSize: 14,
                    fontWeight: FontWeight.w500,
                    color: AppColors.slate900,
                  ),
                ),
                const SizedBox(height: 3),
                Text(
                  subtitle,
                  style: TextStyle(
                    fontSize: 12,
                    color: danger
                        ? const Color(
                            0xFFDC2626,
                          )
                        : AppColors.slate500,
                  ),
                ),
              ],
            ),
          ),

          const SizedBox(width: 12),

          Text(
            amount,
            style: TextStyle(
              fontSize: 14,
              fontWeight: FontWeight.w600,
              color: color,
            ),
          ),
        ],
      ),
    );
  }
}

class _StockRow extends StatelessWidget {
  final String name;
  final int minimum;
  final int stock;

  const _StockRow({
    required this.name,
    required this.minimum,
    required this.stock,
  });

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding:
          const EdgeInsets.symmetric(vertical: 8),
      child: Row(
        children: [
          Expanded(
            child: Column(
              crossAxisAlignment:
                  CrossAxisAlignment.start,
              children: [
                Text(
                  name,
                  style: const TextStyle(
                    fontSize: 14,
                    fontWeight: FontWeight.w500,
                    color: AppColors.slate900,
                  ),
                ),
                const SizedBox(height: 3),
                Text(
                  'Mínimo: $minimum',
                  style: const TextStyle(
                    fontSize: 12,
                    color: AppColors.slate500,
                  ),
                ),
              ],
            ),
          ),

          _Badge(
            text: '$stock em estoque',
            background:
                const Color(0xFFFEF3C7),
            foreground:
                const Color(0xFFB45309),
          ),
        ],
      ),
    );
  }
}

class _Badge extends StatelessWidget {
  final String text;
  final Color background;
  final Color foreground;

  const _Badge({
    required this.text,
    required this.background,
    required this.foreground,
  });

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(
        horizontal: 10,
        vertical: 3,
      ),
      decoration: BoxDecoration(
        color: background,
        borderRadius:
            BorderRadius.circular(999),
      ),
      child: Text(
        text,
        style: TextStyle(
          fontSize: 12,
          fontWeight: FontWeight.w500,
          color: foreground,
        ),
      ),
    );
  }
}

class _DashboardCard extends StatelessWidget {
  final Widget child;

  const _DashboardCard({
    required this.child,
  });

  @override
  Widget build(BuildContext context) {
    return Container(
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(8),
        border: Border.all(
          color: AppColors.slate200,
        ),
        boxShadow: const [
          BoxShadow(
            color: Color(0x0D000000),
            offset: Offset(0, 1),
            blurRadius: 2,
          ),
        ],
      ),
      child: child,
    );
  }
}