const m = {
    program_id: 1, consultor_id: 2, consultor: "Test", empresa: "Emp", nome: "Prog", meta_total: 10, total_horas: 5, horas_realizadas: 5, saldo: 5
};
try {
    const cargaTotal = m.carga_total || m.meta_total;
    const horasRealizadas = m.horas_contabilizadas || m.horas_realizadas || 0;
    const progresso = Math.min(100, Math.round((horasRealizadas / cargaTotal) * 100));
    const iniciais = (m.consultor_nome || '??').substring(0, 2).toUpperCase();
    console.log("SUCCESS", iniciais, progresso);
} catch (e) {
    console.error("FAIL", e);
}
