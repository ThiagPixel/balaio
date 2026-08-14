import 'package:flutter/material.dart';

enum AppBadgeVariant {
  normal,
  success,
  warning,
  danger,
  info,
}

class AppBadge extends StatelessWidget {
  final String text;
  final AppBadgeVariant variant;

  const AppBadge({
    super.key,
    required this.text,
    this.variant = AppBadgeVariant.normal,
  });

  @override
  Widget build(BuildContext context) {
    final (background, foreground) = switch (variant) {
      AppBadgeVariant.normal => (
          const Color(0xFFF1F5F9),
          const Color(0xFF334155),
        ),
      AppBadgeVariant.success => (
          const Color(0xFFD1FAE5),
          const Color(0xFF047857),
        ),
      AppBadgeVariant.warning => (
          const Color(0xFFFEF3C7),
          const Color(0xFFB45309),
        ),
      AppBadgeVariant.danger => (
          const Color(0xFFFEE2E2),
          const Color(0xFFB91C1C),
        ),
      AppBadgeVariant.info => (
          const Color(0xFFE0F2FE),
          const Color(0xFF0369A1),
        ),
    };

    return Container(
      padding: const EdgeInsets.symmetric(
        horizontal: 10,
        vertical: 3,
      ),
      decoration: BoxDecoration(
        color: background,
        borderRadius: BorderRadius.circular(999),
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