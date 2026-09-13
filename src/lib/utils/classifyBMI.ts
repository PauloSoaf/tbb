export interface BMIClassification {
  label: string;
  color: string;
}

export function classifyBMI(bmi: number | null): BMIClassification {
  if (bmi === null) {
    return { label: "Não calculado", color: "gray" };
  }

  if (bmi < 18.5) {
    return { label: "Abaixo do peso", color: "blue" };
  } else if (bmi < 25) {
    return { label: "Peso normal", color: "green" };
  } else if (bmi < 30) {
    return { label: "Sobrepeso", color: "yellow" };
  } else if (bmi < 35) {
    return { label: "Obesidade grau I", color: "orange" };
  } else if (bmi < 40) {
    return { label: "Obesidade grau II", color: "red" };
  } else {
    return { label: "Obesidade grau III", color: "red" };
  }
}
