# Kharcha

Program to analyse bank statements, and categorise and generate a report
for expenses during a time period (depending on duration of the statement)

Recently I did a redesign of this, so that adding different bank statement
support can be added more easily. Please do contribute if you do add any :)

> Experimental: Using IBM BAM AI models to categorise the transactions
> (https://bam.res.ibm.com/)

![Design diagram of kharcha](./assets/kharcha-script.drawio.svg)

Read more in [Design section](#design).

## Usage

### HDFC Bank Statements

1. Login to https://netbanking.hdfcbank.com/netbanking/
2. On the Left side options, Chose 'Enquire' -> 'A/c Statement - Current & Previous Month'.
3. Select Account and Statement Period according to your need (I chose 1st
   to 31st of last month). Click 'View'.
4. Go to bottom of the statement's page, 'Select Format' as 'Delimited',
   then 'Download'

Now run `./kharcha.js --hdfc FILENAME` (where FILENAME is the path to the
downloaded file)

### SBI Bank Statements

1. Login at https://retail.onlinesbi.sbi/retail/login.htm
2. Go to bank statement page, download the statement in PDF format

Now run `./kharcha.js --sbi THE_PDF`

## Design

The design is similar to how some compilers work, where there can be
multiple sources ('source languages' in case of compilers), all of which
much convert to a known & expected format of "Intermediate Representation",
which in our case is just a list of objects, where each object must have
some keys such as 'text', 'debit', 'credit' and 'date' etc.

The current design splits the process of analysing into 3 stages:

Stage 1: Convert passed input into IR (Intermediate Representation)
         This is source dependent, ie. HDFC statement will require
         different logic, SBI will have different logic, HDFC Credit
         card statement might require different logic

         By end of this state, we will have a list of objects with
         'at-least' these keys:

         {
                date: String,
                text: String,
                debit: Number,
                credit: Number,
         }

> Note: Even though 'type' is not mentioned here, but backends can have the
> 'type' column, and these pre-assigned category/type will be considered as
> is by the tool

> Rest of the stages are now independent of whether it's an SBI/HDFC/ICICI
statement etc.

Stage 2: Categorisation, here we add the 'type' labels
         Currently using a manually created list to assign types.
         But as the design is modular now, should be easier to add ML
         into the picture

Stage 3: Analysis/Report Generation
 
