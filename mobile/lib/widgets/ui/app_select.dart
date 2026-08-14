import 'package:flutter/material.dart';

import '../../theme/app_colors.dart';

class AppSelectOption<T> {
  final T value;
  final String label;

  const AppSelectOption({
    required this.value,
    required this.label,
  });
}

class AppSelect<T> extends StatelessWidget {
  final String? label;
  final T? value;
  final List<AppSelectOption<T>> options;
  final ValueChanged<T?>? onChanged;
  final String? error;

  const AppSelect({
    super.key,
    this.label,
    required this.value,
    required this.options,
    required this.onChanged,
    this.error,
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

        DropdownButtonFormField<T>(
          value: value,
          isExpanded: true,
          onChanged: onChanged,
          style: const TextStyle(
            fontSize: 14,
            color: AppColors.slate900,
          ),
          decoration: InputDecoration(
            filled: true,
            fillColor: Colors.white,
            isDense: true,
            contentPadding: const EdgeInsets.symmetric(
              horizontal: 12,
              vertical: 11,
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
          items: options
              .map(
                (option) => DropdownMenuItem<T>(
                  value: option.value,
                  child: Text(option.label),
                ),
              )
              .toList(),
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