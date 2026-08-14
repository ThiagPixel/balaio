import 'package:flutter/material.dart';

import '../../theme/app_colors.dart';
import '../dashboard/dashboard_page.dart';
import '../products/products_page.dart';
import '../stock/stock_page.dart';
import '../financial/financial_page.dart';
import '../members/members_page.dart';
import '../settings/settings_page.dart';

class AppShell extends StatefulWidget {
  const AppShell({super.key});

  @override
  State<AppShell> createState() => _AppShellState();
}

class _AppShellState extends State<AppShell> {
  int selectedIndex = 0;

  void selectPage(int index) {
    setState(() {
      selectedIndex = index;
    });
  }

  @override
  Widget build(BuildContext context) {
    final pages = <Widget>[
      DashboardPage(
        onOpenProducts: () => selectPage(1),
        onOpenFinancial: () => selectPage(3),
      ),
      const ProductsPage(),
      const StockPage(),
      const FinancialPage(),
      MembersPage(
        onBackToSettings: () => selectPage(5),
      ),
      SettingsPage(
        onOpenMembers: () => selectPage(4),
      ),
    ];

    return LayoutBuilder(
      builder: (context, constraints) {
        // Material 3 considera essa uma largura apropriada
        // para trocar para navegação lateral permanente.
        final expanded = constraints.maxWidth >= 840;

        if (expanded) {
          return Scaffold(
            body: SafeArea(
              child: Row(
                children: [
                  SizedBox(
                    width: 256,
                    child: _AppSidebar(
                      selectedIndex: selectedIndex,
                      onSelected: selectPage,
                    ),
                  ),

                  const VerticalDivider(
                    width: 1,
                    thickness: 1,
                  ),

                  Expanded(
                    child: pages[selectedIndex],
                  ),
                ],
              ),
            ),
          );
        }

        return Scaffold(
          appBar: AppBar(
            titleSpacing: 0,
            title: const Row(
              children: [
                _BalaioLogo(size: 32),
                SizedBox(width: 10),
                Text(
                  'Balaio',
                  style: TextStyle(
                    fontWeight: FontWeight.w600,
                  ),
                ),
              ],
            ),
          ),
          drawer: Drawer(
            child: SafeArea(
              child: _AppSidebar(
                selectedIndex: selectedIndex,
                onSelected: (index) {
                  selectPage(index);
                  Navigator.pop(context);
                },
              ),
            ),
          ),
          body: pages[selectedIndex],
        );
      },
    );
  }
}

class _AppSidebar extends StatelessWidget {
  final int selectedIndex;
  final ValueChanged<int> onSelected;

  const _AppSidebar({
    required this.selectedIndex,
    required this.onSelected,
  });

  @override
  Widget build(BuildContext context) {
    final items = [
      (Icons.dashboard_outlined, Icons.dashboard, 'Dashboard'),
      (Icons.inventory_2_outlined, Icons.inventory_2, 'Produtos'),
      (Icons.swap_horiz_outlined, Icons.swap_horiz, 'Estoque'),
      (
        Icons.account_balance_wallet_outlined,
        Icons.account_balance_wallet,
        'Financeiro',
      ),
      (Icons.people_outline, Icons.people, 'Usuários'),
      (Icons.settings_outlined, Icons.settings, 'Configurações'),
    ];

    return Material(
      color: Colors.white,
      child: Column(
        children: [
          SizedBox(
            height: 64,
            child: Padding(
              padding: const EdgeInsets.symmetric(
                horizontal: 20,
              ),
              child: Row(
                children: [
                  const _BalaioLogo(size: 36),

                  const SizedBox(width: 10),

                  Expanded(
                    child: Column(
                      mainAxisAlignment:
                          MainAxisAlignment.center,
                      crossAxisAlignment:
                          CrossAxisAlignment.start,
                      children: [
                        const Text(
                          'Balaio',
                          style: TextStyle(
                            fontWeight: FontWeight.w600,
                            color: AppColors.slate900,
                          ),
                        ),
                        Text(
                          'Minha empresa',
                          maxLines: 1,
                          overflow: TextOverflow.ellipsis,
                          style: const TextStyle(
                            fontSize: 12,
                            color: AppColors.slate500,
                          ),
                        ),
                      ],
                    ),
                  ),
                ],
              ),
            ),
          ),

          const Divider(height: 1),

          Expanded(
            child: ListView.separated(
              padding: const EdgeInsets.all(16),
              itemCount: items.length,
              separatorBuilder: (_, __) =>
                  const SizedBox(height: 4),
              itemBuilder: (context, index) {
                final item = items[index];
                final selected =
                    selectedIndex == index;

                return Material(
                  color: selected
                      ? AppColors.brand50
                      : Colors.transparent,
                  borderRadius:
                      BorderRadius.circular(6),
                  child: InkWell(
                    borderRadius:
                        BorderRadius.circular(6),
                    onTap: () => onSelected(index),
                    child: Padding(
                      padding: const EdgeInsets.symmetric(
                        horizontal: 12,
                        vertical: 11,
                      ),
                      child: Row(
                        children: [
                          Icon(
                            selected
                                ? item.$2
                                : item.$1,
                            size: 21,
                            color: selected
                                ? AppColors.brand700
                                : AppColors.slate700,
                          ),

                          const SizedBox(width: 12),

                          Text(
                            item.$3,
                            style: TextStyle(
                              fontSize: 14,
                              fontWeight:
                                  FontWeight.w500,
                              color: selected
                                  ? AppColors.brand700
                                  : AppColors.slate700,
                            ),
                          ),
                        ],
                      ),
                    ),
                  ),
                );
              },
            ),
          ),

          const Divider(height: 1),

          Padding(
            padding: const EdgeInsets.all(16),
            child: InkWell(
              borderRadius: BorderRadius.circular(6),
              onTap: () {
                // Supabase depois.
              },
              child: const Padding(
                padding: EdgeInsets.symmetric(
                  horizontal: 12,
                  vertical: 11,
                ),
                child: Row(
                  children: [
                    Icon(
                      Icons.logout,
                      size: 21,
                      color: AppColors.slate700,
                    ),
                    SizedBox(width: 12),
                    Text(
                      'Sair',
                      style: TextStyle(
                        fontSize: 14,
                        fontWeight: FontWeight.w500,
                        color: AppColors.slate700,
                      ),
                    ),
                  ],
                ),
              ),
            ),
          ),
        ],
      ),
    );
  }
}

class _BalaioLogo extends StatelessWidget {
  final double size;

  const _BalaioLogo({
    required this.size,
  });

  @override
  Widget build(BuildContext context) {
    return Container(
      width: size,
      height: size,
      alignment: Alignment.center,
      decoration: BoxDecoration(
        color: AppColors.brand600,
        borderRadius: BorderRadius.circular(7),
      ),
      child: Text(
        'B',
        style: TextStyle(
          color: Colors.white,
          fontSize: size * .4,
          fontWeight: FontWeight.w700,
        ),
      ),
    );
  }
}

class _PlaceholderPage extends StatelessWidget {
  final String title;
  final String subtitle;

  const _PlaceholderPage({
    required this.title,
    required this.subtitle,
  });

  @override
  Widget build(BuildContext context) {
    return ColoredBox(
      color: AppColors.slate50,
      child: Center(
        child: Padding(
          padding: const EdgeInsets.all(24),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              Text(
                title,
                style:
                    Theme.of(context).textTheme.headlineMedium?.copyWith(
                          fontWeight: FontWeight.w700,
                          color: AppColors.slate900,
                        ),
              ),
              const SizedBox(height: 8),
              Text(
                subtitle,
                textAlign: TextAlign.center,
                style: const TextStyle(
                  color: AppColors.slate500,
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}