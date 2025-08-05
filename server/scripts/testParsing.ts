// Quick test script for specific parsing cases
import { airlineParserService } from "../services/airlineParserService";

const testCases = [
  {
    name: "UTair Order Numbers",
    airline: "UTair",
    body: `Мария, добрый день!
    
Отмену заказов подтверждаем.

Прошу подсказать ориентировочные сроки поставки по заказам 
P17059425, P17094125 и P17161925.

С уважением,

Ситникова Елизавета`,
    email: { fromEmail: "elizaveta.sitnikova@utair.ru", subject: "Ha: Re: Ha: Re: открытые заказы" }
  },
  {
    name: "Nordwind Part Number",
    airline: "Nordwind",
    body: `Good Afternoon, Colleagues,

Could you please advise if you capable for DRIVE UNIT ASSY-ANT P/N 622-5135-802 recovery?

Thank you,

Evgeny Myzin`,
    email: { fromEmail: "e.myzin@nordwindairlines.ru", subject: "DRIVE UNIT ASSY-ANT P/N 622-5135-802 recovery" }
  },
  {
    name: "Generic with RQ number",
    airline: "Unknown",
    body: `Dear Kirill, 

Could you please provide certificate for RQ-0006011?

Thanks in advance!

Best Regards,
Leisan Silonova`,
    email: { fromEmail: "logistics@iflyltd.ru", subject: "Re: RE: IFLY RFQ // RQ-0006011" }
  }
];

console.log("🧪 Testing Airline Parsers\n");

for (const testCase of testCases) {
  console.log("=".repeat(60));
  console.log(`📧 Test: ${testCase.name}`);
  console.log(`   Expected Airline: ${testCase.airline}`);
  console.log(`   Email: ${testCase.email.fromEmail}`);
  
  const result = airlineParserService.parseEmailByAirline(testCase.email as any, testCase.body);
  
  console.log(`\n📊 Results:`);
  console.log(`   Detected Airline: ${result.airline || "Unknown"}`);
  console.log(`   Is Aviation Request: ${result.isAviationRequest ? "YES" : "NO"}`);
  console.log(`   Parts Found: ${result.orders.length}`);
  
  if (result.orders.length > 0) {
    console.log(`\n📦 Parts:`);
    result.orders.forEach((order, idx) => {
      console.log(`   ${idx + 1}. Part: "${order.partNumber}" (Qty: ${order.quantity})`);
      if (order.description && order.description.length > 0) {
        console.log(`      Description: ${order.description}`);
      }
    });
  } else {
    console.log("\n❌ No parts detected!");
  }
  
  console.log("");
}