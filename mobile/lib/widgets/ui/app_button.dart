import 'package:flutter/material.dart';

import '../../theme/app_colors.dart';

enum AppButtonVariant {
  primary,
  secondary,
  outline,
  ghost,
  danger,
}

enum AppButtonSize {
  sm,
  md,
  lg,
}

class AppButton extends StatelessWidget {
  final String text;
  final VoidCallback? onPressed;
  final AppButtonVariant variant;
  final AppButtonSize size;
  final bool fullWidth;

  const AppButton({
    super.key,
    required this.text,
    required this.onPressed,
    this.variant = AppButtonVariant.primary,
    this.size = AppButtonSize.md,
    this.fullWidth = false,
  });

  double get height {
    return switch (size) {
      AppButtonSize.sm => 32,
      AppButtonSize.md => 40,
      AppButtonSize.lg => 48,
    };
  }

  double get horizontalPadding {
    return switch (size) {
      AppButtonSize.sm => 12,
      AppButtonSize.md => 16,
      AppButtonSize.lg => 24,
    };
  }

  double get fontSize {
    return switch (size) {
      AppButtonSize.sm => 14,
      AppButtonSize.md => 14,
      AppButtonSize.lg => 16,
    };
  }

  @override
  Widget build(BuildContext context) {
    final disabled = onPressed == null;

    Color background;
    Color foreground;
    BorderSide? border;

    switch (variant) {
      case AppButtonVariant.primary:
        background =
            disabled ? AppColors.brand300 : AppColors.brand600;
        foreground = Colors.white;

      case AppButtonVariant.secondary:
        background =
            disabled ? AppColors.slate50 : AppColors.slate100;
        foreground =
            disabled ? AppColors.slate400 : AppColors.slate900;

      case AppButtonVariant.outline:
        background = Colors.white;
        foreground = AppColors.slate900;
        border = const BorderSide(
          color: AppColors.slate300,
        );

      case AppButtonVariant.ghost:
        background = Colors.transparent;
        foreground = AppColors.slate700;

      case AppButtonVariant.danger:
        background =
            disabled ? AppColors.red300 : AppColors.red600;
        foreground = Colors.white;
    }

    final button = SizedBox(
      height: height,
      child: FilledButton(
        onPressed: onPressed,
        style: FilledButton.styleFrom(
          backgroundColor: background,
          disabledBackgroundColor: background,
          foregroundColor: foreground,
          disabledForegroundColor: foreground,
          padding: EdgeInsets.symmetric(
            horizontal: horizontalPadding,
          ),
          elevation: 0,
          side: border,
          shape: RoundedRectangleBorder(
            borderRadius: BorderRadius.circular(6),
          ),
          textStyle: TextStyle(
            fontSize: fontSize,
            fontWeight: FontWeight.w500,
          ),
        ),
        child: Text(text),
      ),
    );

    if (!fullWidth) {
      return button;
    }

    return SizedBox(
      width: double.infinity,
      child: button,
    );
  }
}