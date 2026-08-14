import 'package:flutter/material.dart';

import '../app/app_shell.dart';
import '../../theme/app_colors.dart';
import '../../widgets/ui/app_button.dart';
import '../../widgets/ui/app_card.dart';
import '../../widgets/ui/app_input.dart';
import '../../widgets/auth_layout.dart';

class LoginPage extends StatefulWidget {
  const LoginPage({super.key});

  @override
  State<LoginPage> createState() => _LoginPageState();
}

class _LoginPageState extends State<LoginPage> {
  bool rememberMe = false;

  @override
  Widget build(BuildContext context) {
    return AuthLayout(
      child: AppCard(
        title: 'Entrar',
        description:
            'Acesse sua conta para gerenciar estoque e finanças',
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            const AppInput(
              label: 'Email',
              placeholder: 'voce@empresa.com',
            ),

            const SizedBox(height: 16),

            const AppInput(
              label: 'Senha',
              placeholder: '••••••••',
              obscureText: true,
            ),

            const SizedBox(height: 16),

            Row(
              children: [
                SizedBox(
                  width: 20,
                  height: 20,
                  child: Checkbox(
                    value: rememberMe,
                    visualDensity: VisualDensity.compact,
                    onChanged: (value) {
                      setState(() {
                        rememberMe = value ?? false;
                      });
                    },
                  ),
                ),

                const SizedBox(width: 8),

                const Text(
                  'Lembrar-me',
                  style: TextStyle(
                    fontSize: 14,
                    color: AppColors.slate600,
                  ),
                ),

                const Spacer(),

                TextButton(
                  onPressed: () {},
                  child: const Text(
                    'Esqueci minha senha',
                  ),
                ),
              ],
            ),

            const SizedBox(height: 16),

            AppButton(
              text: 'Entrar',
              fullWidth: true,
              onPressed: () {
                Navigator.of(context).pushReplacement(
                  MaterialPageRoute(
                    builder: (_) => const AppShell(),
                  ),
                );
              },
            ),

            const SizedBox(height: 16),

            Row(
              mainAxisAlignment: MainAxisAlignment.center,
              children: [
                const Text(
                  'Não tem conta? ',
                  style: TextStyle(
                    fontSize: 14,
                    color: AppColors.slate600,
                  ),
                ),

                InkWell(
                  onTap: () {},
                  child: const Text(
                    'Criar empresa',
                    style: TextStyle(
                      fontSize: 14,
                      fontWeight: FontWeight.w500,
                      color: AppColors.brand600,
                    ),
                  ),
                ),
              ],
            ),
          ],
        ),
      ),
    );
  }
}