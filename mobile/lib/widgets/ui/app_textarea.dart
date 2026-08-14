import 'package:flutter/material.dart';

import '../../theme/app_colors.dart';

class AppTextarea extends StatelessWidget {
  final String? label;
  final String? placeholder;
  final String? error;

  final int rows;
  final TextEditingController? controller;

  const AppTextarea({
    super.key,
    this.label,
    this.placeholder,
    this.error,
    this.rows = 3,
    this.controller,
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
          minLines: rows,
          maxLines: rows,
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
              ),
            ),
            border: OutlineInputBorder(
              borderRadius: BorderRadius.circular(6),
            ),
          ),
        ),

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