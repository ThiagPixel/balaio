import 'package:flutter/material.dart';

import 'pages/auth/login_page.dart';
import 'theme/app_colors.dart';

void main() {
  runApp(const BalaioApp());
}

class BalaioApp extends StatelessWidget {
  const BalaioApp({super.key});

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      title: 'Balaio',
      debugShowCheckedModeBanner: false,
      theme: ThemeData(
        useMaterial3: true,
        colorScheme: ColorScheme.fromSeed(
          seedColor: AppColors.brand600,
          brightness: Brightness.light,
        ),
        scaffoldBackgroundColor: AppColors.slate50,
      ),
      home: const LoginPage(),
    );
  }
}