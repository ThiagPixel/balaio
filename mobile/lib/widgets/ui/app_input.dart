import 'package:flutter/material.dart';

import '../../theme/app_colors.dart';

class AppInput extends StatelessWidget {
  final String? label;
  final String? placeholder;
  final String? error;
  final String? hint;
  final TextEditingController? controller;
  final TextInputType? keyboardType;
  final bool enabled;
  final ValueChanged<String>? onChanged;

  final bool obscureText;

  const AppInput({
    super.key,
    this.label,
    this.placeholder,
    this.error,
    this.hint,
    this.controller,
    this.keyboardType,
    this.enabled = true,
    this.obscureText = false,
    this.onChanged,
  });

  @override
  Widget build(BuildContext context) {
    final hasError = error != null;

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        if (label != null) ...[
          Text(
            label!,
            style: const TextStyle(
              fontSize: 14,
              fontWeight: FontWeight.w500,
              color: AppColors.slate700,
            ),
          ),

          const SizedBox(height: 6),
        ],

        TextField(
          controller: controller,
          keyboardType: keyboardType,
          enabled: enabled,
          obscureText: obscureText,
          
          style: const TextStyle(
            fontSize: 14,
            color: AppColors.slate900,
          ),
          decoration: InputDecoration(
            hintText: placeholder,

            hintStyle: const TextStyle(
              fontSize: 14,
              color: AppColors.slate400,
            ),

            filled: true,
            fillColor: Colors.white,

            isDense: true,

            contentPadding: const EdgeInsets.symmetric(
              horizontal: 12,
              vertical: 10,
            ),

            enabledBorder: OutlineInputBorder(
              borderRadius: BorderRadius.circular(6),
              borderSide: BorderSide(
                color: hasError
                    ? AppColors.red500
                    : AppColors.slate300,
              ),
            ),

            focusedBorder: OutlineInputBorder(
              borderRadius: BorderRadius.circular(6),
              borderSide: BorderSide(
                color: hasError
                    ? AppColors.red500
                    : AppColors.brand500,
                width: 1,
              ),
            ),

            border: OutlineInputBorder(
              borderRadius: BorderRadius.circular(6),
            ),
          ),
        ),

        if (hint != null && !hasError) ...[
          const SizedBox(height: 4),

          Text(
            hint!,
            style: const TextStyle(
              fontSize: 12,
              color: AppColors.slate500,
            ),
          ),
        ],

        if (error != null) ...[
          const SizedBox(height: 4),

          Text(
            error!,
            style: const TextStyle(
              fontSize: 12,
              color: AppColors.red600,
            ),
          ),
        ],
      ],
    );
  }
}