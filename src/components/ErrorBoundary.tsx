import { Component, type ErrorInfo, type ReactNode } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { colors } from '../theme';
import { PrimaryButton } from './PrimaryButton';

type Props = { children: ReactNode };
type State = { failed: boolean };

/**
 * Última barreira contra falhas de renderização: em vez de uma tela em branco, mostra uma mensagem
 * compreensível e permite tentar de novo. Detalhes técnicos ficam só no log.
 */
export class ErrorBoundary extends Component<Props, State> {
  state: State = { failed: false };

  static getDerivedStateFromError(): State {
    return { failed: true };
  }

  componentDidCatch(error: Error, info: ErrorInfo): void {
    console.error('Falha ao renderizar:', error.message, info.componentStack);
  }

  private retry = (): void => {
    this.setState({ failed: false });
  };

  render(): ReactNode {
    if (!this.state.failed) return this.props.children;

    return (
      <View style={styles.container} accessibilityRole="alert">
        <Text style={styles.title}>Algo deu errado</Text>
        <Text style={styles.message}>Ocorreu um erro inesperado. Tente novamente.</Text>
        <PrimaryButton title="Tentar novamente" onPress={this.retry} />
      </View>
    );
  }
}

const styles = StyleSheet.create({
  container: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24, gap: 12, backgroundColor: colors.background },
  title: { fontSize: 20, fontWeight: '700', color: colors.text },
  message: { color: colors.textMuted, textAlign: 'center' },
});
