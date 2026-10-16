Mi recomendación es no intentar resolver la jerarquía dentro de la wallet, sino en tu backend. Interledger mueve el dinero y tu aplicación lleva la estructura empresa → conductor.

Cómo lo haría

1. Una sola cuenta por transportadora, y los conductores son “etiquetas” en tu base de datos

La empresa tiene una cuenta/wallet address en su moneda.
Cada conductor o vehículo existe solo en tu base de datos (company_id, driver_id, vehicle_id).
Cada QR representa un vehículo. No apunta directo a la wallet address, sino a una URL de tu backend.

2. Flujo de pago con QR

El pasajero escanea el QR, que lleva a tu backend con el vehicle_id.
Tu backend crea un incoming payment en la wallet de la empresa con el monto de la tarifa y un campo metadata con driver_id, vehicle_id y route_id.
El pasajero, desde su wallet, hace el quote y el outgoing payment hacia ese incoming payment.
Tu backend recibe la confirmación y registra el viaje a nombre del conductor.

Así sabes exactamente qué conductor cobró qué, sin necesitar subcuentas reales.

3. Reparto a los conductores

Cada conductor acumula un saldo contable en tu base de datos.
Si quieren pagarles, la empresa hace outgoing payments hacia la wallet de cada conductor (diario, semanal o a demanda).
Para el hackathon, puedes simularlo con un panel donde el conductor ve sus ingresos.
Alternativa más “real”

Si la plataforma que usan (por ejemplo Rafiki o la Test Wallet) permite crear varias wallet addresses sobre la misma cuenta, puedes darle una wallet address por conductor o vehículo. El dinero queda agrupado en la cuenta de la empresa y cada pago llega identificado por dirección. Revisa en la documentación si lo permite tal cual lo van a usar, porque eso depende de la implementación.

Sobre el problema de la moneda

Que cada cuenta sea de una sola moneda no es un obstáculo para el pasajero. Interledger se encarga de la conversión: el pasajero paga desde su moneda, el quote calcula la conversión y la empresa recibe en la suya. Solo importa que cada receptor tenga su cuenta en su moneda local.

Para el hackathon

Yo iría con la opción de metadata + backend propio como base. Es lo más rápido de construir y se ve profesional en la demo. Si les queda tiempo, muestran la variante de wallet address por conductor como mejora futura.

¿La empresa y los conductores estarían en el mismo país y moneda, o piensan mostrar también el caso de pasajeros de otra moneda? Eso cambia un poco lo que conviene resaltar en la demo.
