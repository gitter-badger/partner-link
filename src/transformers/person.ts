import { Transformer, XmlToObjectTransformer, ObjectToXmlTransformer } from "./transformer";
import { PartnerLinkError, CreditSearchPersonResult, CreditSearchPerson } from "../types";
import { CreditorTransformer } from "./creditor";

export class CreditSearchPersonTransformer extends Transformer implements ObjectToXmlTransformer {
  public item(object: CreditSearchPerson): string {
    if (object.addresses.length === 0) { throw new PartnerLinkError("No addresses given.", 406) }

    return `
<?xml version="1.0" encoding="utf-8"?>
<soap:Envelope xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xmlns:xsd="http://www.w3.org/2001/XMLSchema" xmlns:soap="http://schemas.xmlsoap.org/soap/envelope/">
  <soap:Body>
    <GetLightSearchAccountDataWithCreditSearchID xmlns="http://searchlink.co.uk/">
      <ClientReference>${object.clientReference}</ClientReference>
      <Title>${object.title}</Title>
      <Forename>${object.firstName}</Forename>
      <Surname>${object.lastName}</Surname>
      <DateOfBirth>${object.dateOfBirth.format("YYYY-MM-DD")}</DateOfBirth>

      <PTCAB1>${object.addresses[0] !== undefined && object.addresses[0] !== null ? object.addresses[0].id : ''}</PTCAB1>
      <HouseNumber1>${object.addresses[0] !== undefined && object.addresses[0] !== null ? object.addresses[0].address1 : ''}</HouseNumber1>
      <PostCode1>${object.addresses[0] !== undefined && object.addresses[0] !== null ? object.addresses[0].postalCode : ''}</PostCode1>
      <Town1>${object.addresses[0] !== undefined && object.addresses[0] !== null ? object.addresses[0].town : ''}</Town1>
      <StreetName1>${object.addresses[0] !== undefined && object.addresses[0] !== null ? object.addresses[0].address1 : ''}</StreetName1>

      <PTCAB2>${object.addresses[1] !== undefined && object.addresses[1] !== null ? object.addresses[1].id : ''}</PTCAB2>
      <HouseNumber2>${object.addresses[1] !== undefined && object.addresses[1] !== null ? object.addresses[1].address1 : ''}</HouseNumber2>
      <PostCode2>${object.addresses[1] !== undefined && object.addresses[1] !== null ? object.addresses[1].postalCode : ''}</PostCode2>
      <Town2>${object.addresses[1] !== undefined && object.addresses[1] !== null ? object.addresses[1].town : ''}</Town2>
      <StreetName2>${object.addresses[1] !== undefined && object.addresses[1] !== null ? object.addresses[1].address1 : ''}</StreetName2>

      <PTCAB3>${object.addresses[2] !== undefined && object.addresses[2] !== null ? object.addresses[2].id : ''}</PTCAB3>
      <HouseNumber3>${object.addresses[2] !== undefined && object.addresses[2] !== null ? object.addresses[2].address1 : ''}</HouseNumber3>
      <PostCode3>${object.addresses[2] !== undefined && object.addresses[2] !== null ? object.addresses[2].postalCode : ''}</PostCode3>
      <Town3>${object.addresses[2] !== undefined && object.addresses[2] !== null ? object.addresses[2].town : ''}</Town3>
      <StreetName3>${object.addresses[2] !== undefined && object.addresses[2] !== null ? object.addresses[2].address1 : ''}</StreetName3>

      <cred>
        <Client>${this.credentials.creditSearchClient}</Client>
        <UserName>${this.credentials.creditSearchUsername}</UserName>
        <Password>${this.credentials.creditSearchPassword}</Password>
      </cred>
    </GetLightSearchAccountDataWithCreditSearchID>
  </soap:Body>
</soap:Envelope>
    `;
  }
}

export class CreditReportTransformer extends Transformer {
  public item(id: number): string {
    return `
<?xml version="1.0" encoding="utf-8"?>
<soap:Envelope xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xmlns:xsd="http://www.w3.org/2001/XMLSchema" xmlns:soap="http://schemas.xmlsoap.org/soap/envelope/">
  <soap:Body>
    <GetLightSearchCreditReportHTML xmlns="http://searchlink.co.uk/">
      <creditSearchID>${id}</creditSearchID>
      <cred>
        <Client>${this.credentials.creditSearchClient}</Client>
        <UserName>${this.credentials.creditSearchUsername}</UserName>
        <Password>${this.credentials.creditSearchPassword}</Password>
      </cred>
    </GetLightSearchCreditReportHTML>
  </soap:Body>
</soap:Envelope>
    `;
  }

  public getHtmlFromResult(xml: string): Promise<string> {
    return Promise.resolve(xml)
      .then(xml => this.parseXml(xml))
      .then(parsedResult => parsedResult["soap:Envelope"]["soap:Body"][0]["GetLightSearchCreditReportHTMLResponse"][0]["GetLightSearchCreditReportHTMLResult"][0])
      .then(singleResult => Buffer.from(singleResult, 'base64').toString("ascii"));
  }
}

export class CreditSearchPersonResultTransformer extends Transformer implements XmlToObjectTransformer {
  public xmlItem(xml: string): Promise<CreditSearchPersonResult> {
    return Promise.resolve(xml)
      .then(xml => this.parseXml(xml))
      .then(parsedResult => parsedResult["soap:Envelope"]["soap:Body"][0]["GetLightSearchAccountDataWithCreditSearchIDResponse"][0]["GetLightSearchAccountDataWithCreditSearchIDResult"][0])
      .then(singleResult => this.parseXml(singleResult))
      .then(parsedSingleResult => parsedSingleResult["Account"])
      .then(personResult => {
        let returnPersonResult = new CreditSearchPersonResult;

        returnPersonResult.id = parseInt(personResult["$"]["ID"]);
        returnPersonResult.creditors = personResult["AccountData"].map(creditor => (new CreditorTransformer(this.credentials)).parseXmlItem(creditor["$"]));

        return returnPersonResult;
      })
  }

  public xmlItems(xml: string): Promise<CreditSearchPersonResult[]> {
    let parsedResults: string[] = [];

    return Promise.all(parsedResults.map(address => this.xmlItem(address)));
  }
}